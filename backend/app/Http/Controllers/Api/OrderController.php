<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Display a listing of orders.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with(['items', 'customer'])->latest('placed_at');

        $email = $request->input('customer_email') ?: $request->input('email');
        if (! empty($email)) {
            $cleanEmail = strtolower(trim($email));
            $query->where(function ($q) use ($cleanEmail) {
                $q->whereRaw('LOWER(customer_email) = ?', [$cleanEmail])
                    ->orWhereHas('customer', function ($cq) use ($cleanEmail) {
                        $cq->whereRaw('LOWER(email) = ?', [$cleanEmail]);
                    });
            });
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'active') {
                $query->active();
            } elseif ($status === 'past') {
                $query->past();
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('search')) {
            $rawSearch = trim($request->search);
            $cleanSearch = ltrim($rawSearch, '#');
            $digits = preg_replace('/\D/', '', $cleanSearch);

            $query->where(function ($q) use ($rawSearch, $cleanSearch, $digits) {
                $q->where('order_number', 'like', "%{$rawSearch}%")
                    ->orWhere('order_number', 'like', "%{$cleanSearch}%")
                    ->orWhere('customer_name', 'like', "%{$rawSearch}%")
                    ->orWhere('customer_email', 'like', "%{$rawSearch}%");

                if (! empty($digits) && strlen($digits) >= 3) {
                    $q->orWhere('order_number', 'like', "%{$digits}%")
                        ->orWhere('order_number', 'like', "RD-{$digits}%");
                }

                $q->orWhereHas('items', function ($iq) use ($rawSearch) {
                    $iq->where('product_name', 'like', "%{$rawSearch}%")
                        ->orWhere('sku', 'like', "%{$rawSearch}%");
                });
            });
        }

        $perPage = $request->integer('per_page', 25);
        $orders = $query->paginate($perPage);

        return OrderResource::collection($orders);
    }

    /**
     * Store a newly created order.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'nullable|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'customer_id' => 'nullable|integer',
            'customer_address_id' => 'nullable|integer',
            'payment_method' => 'nullable|string|max:100',
            'shipping_address' => 'nullable|array',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable',
            'items.*.name' => 'required|string|max:255',
            'items.*.category' => 'nullable|string|max:100',
            'items.*.sku' => 'nullable|string|max:100',
            'items.*.banner_image' => 'nullable|string',
            'items.*.viewer_type' => 'nullable|string|max:100',
            'items.*.selected_color' => 'nullable|string|max:50',
            'items.*.selected_color_name' => 'nullable|string|max:100',
            'items.*.selected_size' => 'nullable|string|max:100',
            'items.*.customization' => 'nullable|array',
            'items.*.base_price' => 'nullable|numeric',
            'items.*.addon_price' => 'nullable|numeric',
            'items.*.unit_price' => 'required|numeric',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.total_price' => 'nullable|numeric',
        ]);

        $customerEmail = ! empty($validated['customer_email']) ? strtolower(trim($validated['customer_email'])) : null;
        $customerId = $validated['customer_id'] ?? null;

        $customer = null;
        if ($customerId) {
            $customer = Customer::find($customerId);
        } elseif ($customerEmail) {
            $customer = Customer::whereRaw('LOWER(email) = ?', [$customerEmail])->first();
        }

        if (! $customer) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'CUSTOMER_REQUIRED',
                'message' => 'A registered customer account or verified email is required before placing an order.',
                'action' => 'login_required',
            ], 422);
        }

        // Validate that customer has a complete saved Philippine delivery address
        $address = null;
        if (! empty($validated['customer_address_id'])) {
            $address = CustomerAddress::where('id', $validated['customer_address_id'])
                ->where('customer_id', $customer->id)
                ->first();
        }

        if (! $address) {
            $address = $customer->defaultAddress ?? $customer->addresses()->latest()->first();
        }

        if (! $address) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'ADDRESS_REQUIRED',
                'message' => 'Before a customer is allowed to place an order, a complete Philippine delivery address must be saved in their account/profile.',
                'action' => 'redirect_to_address_form',
            ], 422);
        }

        if (! $address->isComplete()) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'ADDRESS_INCOMPLETE',
                'message' => 'Your saved Philippine delivery address is incomplete. Please ensure Region, Province, City/Municipality, Barangay, and Street details are all provided.',
                'action' => 'redirect_to_address_form',
            ], 422);
        }

        $order = DB::transaction(function () use ($validated, $request, $customer, $address) {
            // Generate distinct order number e.g. RD-8842
            $randomNum = mt_rand(1000, 9999);
            $orderNumber = 'RD-'.$randomNum;
            while (Order::where('order_number', $orderNumber)->exists()) {
                $orderNumber = 'RD-'.mt_rand(1000, 9999);
            }

            $subtotal = 0;
            $customizationTotal = 0;

            foreach ($validated['items'] as $itemData) {
                $qty = (int) ($itemData['quantity'] ?? 1);
                $unitPrice = (float) ($itemData['unit_price'] ?? 0);
                $addonPrice = (float) ($itemData['addon_price'] ?? 0);
                $subtotal += ($unitPrice * $qty);
                $customizationTotal += ($addonPrice * $qty);
            }

            $shippingFee = $request->float('shipping_fee', 0);
            $discountTotal = $request->float('discount_total', 0);
            $grandTotal = max(0, $subtotal + $shippingFee - $discountTotal);

            $expectedDeliveryDate = now()->addDays(5)->format('M d');
            $trackingNum = 'JT-'.mt_rand(100000000, 999999999).'PH';
            $courierName = 'J&T Express';
            $trackingUrl = 'https://www.jtexpress.ph/trajectoryQuery?bills='.$trackingNum;

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $customer->id,
                'customer_address_id' => $address->id,
                'customer_name' => ($validated['customer_name'] ?? null) ?: ($address->recipient_name ?: $customer->name),
                'customer_email' => $customer->email,
                'customer_phone' => ($validated['customer_phone'] ?? null) ?: ($address->phone_number ?: $customer->phone),
                'status' => 'in_progress',
                'placed_at' => now(),
                'expected_delivery' => $expectedDeliveryDate,
                'subtotal' => $subtotal,
                'customization_total' => $customizationTotal,
                'shipping_fee' => $shippingFee,
                'discount_total' => $discountTotal,
                'total' => $grandTotal,
                'payment_method' => $validated['payment_method'] ?? 'Cash on Delivery',
                'payment_status' => 'pending',
                'courier_name' => $courierName,
                'tracking_number' => $trackingNum,
                'tracking_url' => $trackingUrl,
                'tracking_steps' => Order::buildDefaultTrackingSteps('in_progress', now()->format('M d, h:i A'), $courierName, $trackingNum),
                'shipping_address' => $address->toSnapshot(),
                'notes' => ($validated['notes'] ?? null) ?: ($address->delivery_instructions ?: null),
            ]);

            foreach ($validated['items'] as $itemData) {
                $qty = (int) ($itemData['quantity'] ?? 1);
                $unitPrice = (float) ($itemData['unit_price'] ?? 0);
                $basePrice = (float) ($itemData['base_price'] ?? $unitPrice);
                $addonPrice = (float) ($itemData['addon_price'] ?? 0);
                $lineTotal = (float) ($itemData['total_price'] ?? ($unitPrice * $qty));

                $productId = $itemData['product_id'] ?? null;
                if ($productId && is_numeric($productId)) {
                    $prod = Product::find($productId);
                    if ($prod && $prod->track_inventory && $prod->stock_quantity > 0) {
                        $prod->decrement('stock_quantity', min($qty, $prod->stock_quantity));
                    }
                }

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => is_numeric($productId) ? (int) $productId : null,
                    'product_name' => $itemData['name'],
                    'category' => $itemData['category'] ?? null,
                    'sku' => $itemData['sku'] ?? null,
                    'banner_image' => $itemData['banner_image'] ?? null,
                    'viewer_type' => $itemData['viewer_type'] ?? null,
                    'selected_color' => $itemData['selected_color'] ?? null,
                    'selected_color_name' => $itemData['selected_color_name'] ?? null,
                    'selected_size' => $itemData['selected_size'] ?? null,
                    'customization' => $itemData['customization'] ?? null,
                    'base_price' => $basePrice,
                    'addon_price' => $addonPrice,
                    'unit_price' => $unitPrice,
                    'quantity' => $qty,
                    'total_price' => $lineTotal,
                ]);
            }

            return $order->load('items');
        });

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Helper to find an order by ID or order_number flexibly.
     */
    protected function findOrderByIdentifier(string $id): ?Order
    {
        $raw = urldecode(trim($id));
        $clean = trim($raw);
        $unhashed = ltrim($clean, '#');
        $digits = preg_replace('/\D/', '', $unhashed);

        return Order::with(['items', 'customer'])
            ->where(function ($query) use ($clean, $unhashed, $digits) {
                if (is_numeric($clean)) {
                    $query->orWhere('id', (int) $clean);
                }

                $query->orWhereRaw('LOWER(order_number) = ?', [strtolower($clean)])
                    ->orWhereRaw('LOWER(order_number) = ?', [strtolower($unhashed)])
                    ->orWhereRaw('REPLACE(LOWER(order_number), "-", "") = ?', [strtolower($unhashed)]);

                if (! empty($digits) && strlen($digits) >= 3) {
                    $query->orWhereRaw('LOWER(order_number) = ?', [strtolower('RD-'.$digits)])
                        ->orWhere('order_number', 'like', '%-'.$digits);
                }
            })
            ->first();
    }

    /**
     * Display the specified order.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id);

        if (! $order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // If client passed email verification, verify ownership
        $email = $request->input('customer_email') ?: $request->input('email');
        if (! empty($email)) {
            $cleanEmail = strtolower(trim($email));
            $orderEmail = strtolower(trim($order->customer_email ?? ''));
            $custEmail = strtolower(trim($order->customer->email ?? ''));

            if ($orderEmail !== $cleanEmail && $custEmail !== $cleanEmail) {
                // If it doesn't match, verify if user is admin or allow direct reference match
                // We allow direct order_number match if the client knows the exact reference
                if (strtolower($order->order_number) !== strtolower(ltrim(trim($id), '#'))) {
                    return response()->json(['message' => 'Order not found for this customer'], 404);
                }
            }
        }

        return (new OrderResource($order))->response();
    }

    /**
     * Update order status and tracking progress.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id);

        if (! $order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:in_progress,processing,delivered,cancelled',
            'notes' => 'nullable|string',
        ]);

        $newStatus = $validated['status'];

        if ($newStatus === 'cancelled') {
            if ($order->status === 'delivered') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Delivered orders cannot be cancelled.',
                ], 422);
            }

            $order->cancelled_at = now();
            $order->cancellation_reason = $validated['notes'] ?? 'Cancelled by customer';

            // Restore inventory if not already cancelled
            if ($order->status !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product_id) {
                        $prod = Product::find($item->product_id);
                        if ($prod && $prod->track_inventory) {
                            $prod->increment('stock_quantity', $item->quantity);
                        }
                    }
                }
            }
        } elseif ($newStatus === 'delivered') {
            $order->delivered_at = now();
            $order->payment_status = 'paid';
        }

        $order->status = $newStatus;
        if (isset($validated['notes'])) {
            $order->notes = $validated['notes'];
        }

        $order->tracking_steps = Order::buildDefaultTrackingSteps(
            $newStatus,
            $order->placed_at ? $order->placed_at->format('M d, h:i A') : now()->format('M d, h:i A'),
            $order->courier_name,
            $order->tracking_number
        );

        $order->save();

        return (new OrderResource($order->load('items')))->response();
    }

    /**
     * Explicit cancel order endpoint for mobile and web clients.
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $order = $this->findOrderByIdentifier($id);

        if (! $order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        if ($order->status === 'delivered') {
            return response()->json([
                'status' => 'error',
                'message' => 'Delivered orders cannot be cancelled.',
            ], 422);
        }

        if ($order->status === 'cancelled') {
            return response()->json([
                'status' => 'info',
                'message' => 'Order is already cancelled.',
                'order' => new OrderResource($order->load('items')),
            ]);
        }

        $reason = $request->input('reason', $request->input('notes', 'Cancelled by customer'));

        $order->status = 'cancelled';
        $order->cancelled_at = now();
        $order->cancellation_reason = $reason;
        $order->notes = $reason;

        // Restore inventory
        foreach ($order->items as $item) {
            if ($item->product_id) {
                $prod = Product::find($item->product_id);
                if ($prod && $prod->track_inventory) {
                    $prod->increment('stock_quantity', $item->quantity);
                }
            }
        }

        $order->tracking_steps = Order::buildDefaultTrackingSteps(
            'cancelled',
            $order->placed_at ? $order->placed_at->format('M d, h:i A') : now()->format('M d, h:i A'),
            $order->courier_name,
            $order->tracking_number
        );

        $order->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Order #'.$order->order_number.' has been cancelled successfully.',
            'order' => new OrderResource($order->load('items')),
        ]);
    }
}
