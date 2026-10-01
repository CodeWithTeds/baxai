<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Display a listing of orders.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with('items')->latest('placed_at');

        if ($request->filled('customer_email')) {
            $query->where('customer_email', strtolower(trim($request->customer_email)));
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
            $search = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', $search)
                  ->orWhere('customer_name', 'like', $search)
                  ->orWhereHas('items', function ($iq) use ($search) {
                      $iq->where('product_name', 'like', $search)
                         ->orWhere('sku', 'like', $search);
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

        $order = DB::transaction(function () use ($validated, $request) {
            // Generate distinct order number e.g. RD-8842
            $randomNum = mt_rand(1000, 9999);
            $orderNumber = 'RD-' . $randomNum;
            while (Order::where('order_number', $orderNumber)->exists()) {
                $orderNumber = 'RD-' . mt_rand(1000, 9999);
            }

            $customerEmail = !empty($validated['customer_email']) ? strtolower(trim($validated['customer_email'])) : null;
            $customerId = $validated['customer_id'] ?? null;

            if ($customerEmail && !$customerId) {
                $customer = Customer::where('email', $customerEmail)->first();
                if ($customer) {
                    $customerId = $customer->id;
                }
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

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $customerId,
                'customer_name' => $validated['customer_name'] ?? 'Mobile Customer',
                'customer_email' => $customerEmail,
                'customer_phone' => $validated['customer_phone'] ?? null,
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
                'tracking_steps' => Order::buildDefaultTrackingSteps('in_progress', now()->format('M d, h:i A')),
                'shipping_address' => $validated['shipping_address'] ?? null,
                'notes' => $validated['notes'] ?? null,
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
     * Display the specified order.
     */
    public function show(string $id): JsonResponse
    {
        $order = Order::with('items')
            ->where('id', $id)
            ->orWhere('order_number', $id)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return (new OrderResource($order))->response();
    }

    /**
     * Update order status and tracking progress.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $order = Order::where('id', $id)
            ->orWhere('order_number', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:in_progress,processing,delivered,cancelled',
            'notes' => 'nullable|string',
        ]);

        $order->status = $validated['status'];
        if (isset($validated['notes'])) {
            $order->notes = $validated['notes'];
        }

        $order->tracking_steps = Order::buildDefaultTrackingSteps(
            $validated['status'],
            $order->placed_at ? $order->placed_at->format('M d, h:i A') : now()->format('M d, h:i A')
        );

        $order->save();

        return (new OrderResource($order->load('items')))->response();
    }
}
