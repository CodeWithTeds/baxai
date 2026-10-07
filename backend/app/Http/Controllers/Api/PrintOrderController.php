<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePrintOrderRequest;
use App\Http\Requests\UpdatePrintOrderStatusRequest;
use App\Http\Resources\PrintOrderResource;
use App\Models\PrintOrder;
use App\Models\PrintService;
use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PrintOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PrintOrder::with(['customer', 'service'])->latest('placed_at');

        $email = $request->input('customer_email') ?: $request->input('email');
        if (! empty($email)) {
            $cleanEmail = strtolower(trim($email));
            $query->whereHas('customer', function ($cq) use ($cleanEmail) {
                $cq->whereRaw('LOWER(email) = ?', [$cleanEmail]);
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

        $perPage = $request->integer('per_page', 25);
        $orders = $query->paginate($perPage);

        return PrintOrderResource::collection($orders);
    }

    public function store(StorePrintOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $service = PrintService::findOrFail($validated['service_id']);

        $customer = $request->user()->customer;
        if (! $customer) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'CUSTOMER_REQUIRED',
                'message' => 'A registered customer account is required before placing a print order.',
            ], 422);
        }

        $address = null;
        if ($validated['fulfillment_type'] === 'delivery') {
            $address = CustomerAddress::where('id', $validated['customer_address_id'])
                ->where('customer_id', $customer->id)
                ->first();

            if (! $address) {
                return response()->json([
                    'status' => 'error',
                    'error_code' => 'ADDRESS_REQUIRED',
                    'message' => 'Please select a valid delivery address.',
                ], 422);
            }
        }

        $file = $request->file('file');
        $fileExtension = strtolower($file->extension());
        $allowedTypes = $service->allowed_file_types ?? ['pdf', 'png', 'jpg', 'jpeg', 'ai', 'psd', 'docx', 'svg'];

        if (! in_array($fileExtension, $allowedTypes)) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'INVALID_FILE_TYPE',
                'message' => 'File type not allowed. Accepted: '.implode(', ', $allowedTypes),
            ], 422);
        }

        $maxSizeMB = $service->max_file_size_mb ?? 100;
        if ($file->getSize() > $maxSizeMB * 1024 * 1024) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'FILE_TOO_LARGE',
                'message' => "File size must not exceed {$maxSizeMB}MB.",
            ], 422);
        }

        $order = DB::transaction(function () use ($request, $validated, $service, $customer, $address, $file, $fileExtension) {
            $randomNum = mt_rand(1000, 9999);
            $orderNumber = 'PR-'.$randomNum;
            while (PrintOrder::where('order_number', $orderNumber)->exists()) {
                $orderNumber = 'PR-'.mt_rand(1000, 9999);
            }

            $quantity = (int) $validated['quantity'];
            $unitPrice = (float) $service->base_price;

            $specifications = $validated['specifications'] ?? [];
            $specTotal = 0;
            foreach ($specifications as $spec) {
                if (isset($spec['price_modifier'])) {
                    $specTotal += (float) $spec['price_modifier'];
                }
            }

            $subtotal = ($unitPrice + $specTotal) * $quantity;

            $rushFee = 0;
            if (! empty($validated['is_rush']) && $service->rush_surcharge_type !== 'none') {
                if ($service->rush_surcharge_type === 'percentage') {
                    $rushFee = $subtotal * ((float) $service->rush_surcharge_amount / 100);
                } else {
                    $rushFee = (float) $service->rush_surcharge_amount;
                }
            }

            $shippingFee = 0;
            $trackingNum = null;
            $courierName = null;
            $trackingUrl = null;

            if ($validated['fulfillment_type'] === 'delivery') {
                $shippingFee = 100;
                $trackingNum = 'JT-'.mt_rand(100000000, 999999999).'PH';
                $courierName = 'J&T Express';
                $trackingUrl = 'https://www.jtexpress.ph/trajectoryQuery?bills='.$trackingNum;
            }

            $total = $subtotal + $rushFee + $shippingFee;

            $fileOrderNumber = $orderNumber;
            $filePath = $file->store("print-orders/{$fileOrderNumber}", 'public');

            $gcashScreenshotPath = null;
            if ($validated['payment_method'] === 'gcash' && $request->hasFile('gcash_screenshot')) {
                $gcashScreenshotPath = $request->file('gcash_screenshot')
                    ->store("print-orders/{$fileOrderNumber}/gcash", 'public');
            }

            $order = PrintOrder::create([
                'order_number' => $orderNumber,
                'customer_id' => $customer->id,
                'customer_address_id' => $address?->id,
                'service_id' => $service->id,
                'service_name' => $service->name,
                'specifications' => $specifications,
                'file_url' => $filePath,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'file_type' => $fileExtension,
                'quantity' => $quantity,
                'unit_price' => $unitPrice + $specTotal,
                'subtotal' => $subtotal,
                'rush_fee' => $rushFee,
                'shipping_fee' => $shippingFee,
                'total' => $total,
                'fulfillment_type' => $validated['fulfillment_type'],
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_method'] === 'gcash' ? 'pending_verification' : 'pending',
                'gcash_reference_number' => $validated['gcash_reference_number'] ?? null,
                'gcash_screenshot_url' => $gcashScreenshotPath,
                'courier_name' => $courierName,
                'tracking_number' => $trackingNum,
                'tracking_url' => $trackingUrl,
                'notes' => $validated['notes'] ?? null,
                'placed_at' => now(),
            ]);

            return $order->load(['customer', 'service']);
        });

        return (new PrintOrderResource($order))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $order = PrintOrder::with(['customer', 'service'])->find($id);

        if (! $order) {
            return response()->json(['message' => 'Print order not found'], 404);
        }

        $email = $request->input('customer_email') ?: $request->input('email');
        if (! empty($email)) {
            $cleanEmail = strtolower(trim($email));
            $orderEmail = strtolower(trim($order->customer?->email ?? ''));

            if ($orderEmail !== $cleanEmail) {
                return response()->json(['message' => 'Print order not found for this customer'], 404);
            }
        }

        return (new PrintOrderResource($order))->response();
    }

    public function updateStatus(UpdatePrintOrderStatusRequest $request, string $id): JsonResponse
    {
        $order = PrintOrder::find($id);

        if (! $order) {
            return response()->json(['message' => 'Print order not found'], 404);
        }

        $validated = $request->validated();
        $newStatus = $validated['status'];

        if ($newStatus === 'cancelled') {
            if ($order->status !== 'pending') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only pending orders can be cancelled.',
                ], 422);
            }
            $order->cancelled_at = now();
            $order->cancellation_reason = $validated['notes'] ?? 'Cancelled';
        } elseif ($newStatus === 'shipped') {
            $order->shipped_at = now();
            if ($request->filled('courier_name')) {
                $order->courier_name = $request->input('courier_name');
            }
            if ($request->filled('tracking_number')) {
                $order->tracking_number = $request->input('tracking_number');
                $order->tracking_url = 'https://www.jtexpress.ph/trajectoryQuery?bills='.$order->tracking_number;
            }
        } elseif ($newStatus === 'delivered' || $newStatus === 'picked_up') {
            $order->delivered_at = now();
            $order->payment_status = 'paid';
        }

        $order->status = $newStatus;
        if (isset($validated['notes'])) {
            $order->admin_notes = $validated['notes'];
        }
        $order->save();

        return (new PrintOrderResource($order->load(['customer', 'service'])))->response();
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $order = PrintOrder::find($id);

        if (! $order) {
            return response()->json(['message' => 'Print order not found'], 404);
        }

        if (! $order->isCancellable()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only pending orders can be cancelled.',
            ], 422);
        }

        $order->status = 'cancelled';
        $order->cancelled_at = now();
        $order->cancellation_reason = $request->input('reason', 'Cancelled by customer');
        $order->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Print order #'.$order->order_number.' has been cancelled.',
            'order' => new PrintOrderResource($order->load(['customer', 'service'])),
        ]);
    }

    public function downloadFile(string $id)
    {
        $order = PrintOrder::find($id);

        if (! $order || ! $order->file_url) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $path = storage_path('app/public/'.$order->file_url);

        if (! file_exists($path)) {
            return response()->json(['message' => 'File not found on disk'], 404);
        }

        return response()->download($path, $order->file_name);
    }
}
