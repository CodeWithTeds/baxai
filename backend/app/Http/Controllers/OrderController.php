<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Order::with(['items', 'customer'])->latest('placed_at');

        if ($request->filled('filter.search')) {
            $search = trim($request->input('filter.search'));
            $cleanSearch = ltrim($search, '#');
            $query->where(function ($q) use ($search, $cleanSearch) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('order_number', 'like', "%{$cleanSearch}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhereHas('items', function ($iq) use ($search) {
                        $iq->where('product_name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('filter.status') && $request->input('filter.status') !== 'all') {
            $query->where('status', $request->input('filter.status'));
        }

        if ($request->filled('filter.payment_status') && $request->input('filter.payment_status') !== 'all') {
            $query->where('payment_status', $request->input('filter.payment_status'));
        }

        $sort = $request->input('sort', '-placed_at');
        if ($sort === 'placed_at') {
            $query->orderBy('placed_at', 'asc');
        } elseif ($sort === '-placed_at') {
            $query->orderBy('placed_at', 'desc');
        } elseif ($sort === '-total') {
            $query->orderBy('total', 'desc');
        } elseif ($sort === 'total') {
            $query->orderBy('total', 'asc');
        } elseif ($sort === 'order_number') {
            $query->orderBy('order_number', 'asc');
        }

        $perPage = (int) $request->input('per_page', 10);
        $orders = $query->paginate($perPage)->withQueryString();

        $stats = [
            'total' => Order::count(),
            'in_progress' => Order::where('status', 'in_progress')->count(),
            'processing' => Order::where('status', 'processing')->count(),
            'delivered' => Order::where('status', 'delivered')->count(),
            'cancelled' => Order::where('status', 'cancelled')->count(),
            'total_revenue' => (float) Order::where('status', '!=', 'cancelled')->sum('total'),
        ];

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'filters' => $request->only('filter', 'sort', 'per_page'),
            'stats' => $stats,
        ]);
    }

    public function show(Order $order): Response
    {
        return Inertia::render('orders/show', [
            'order' => $order->load(['items', 'customer', 'customerAddress']),
        ]);
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:in_progress,processing,delivered,cancelled',
            'payment_status' => 'nullable|string|in:pending,paid,failed,refunded',
            'courier_name' => 'nullable|string|max:100',
            'tracking_number' => 'nullable|string|max:100',
            'tracking_url' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:2000',
        ]);

        $newStatus = $validated['status'];

        if ($newStatus === 'cancelled' && $order->status !== 'cancelled') {
            $order->cancelled_at = now();
            $order->cancellation_reason = $validated['notes'] ?? 'Cancelled by admin';

            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $prod = Product::find($item->product_id);
                    if ($prod && $prod->track_inventory) {
                        $prod->increment('stock_quantity', $item->quantity);
                    }
                }
            }
        } elseif ($newStatus === 'delivered') {
            $order->delivered_at = now();
            $order->payment_status = 'paid';
        }

        if (! empty($validated['payment_status'])) {
            $order->payment_status = $validated['payment_status'];
        }

        if (array_key_exists('courier_name', $validated)) {
            $order->courier_name = $validated['courier_name'];
        }
        if (array_key_exists('tracking_number', $validated)) {
            $order->tracking_number = $validated['tracking_number'];
        }
        if (array_key_exists('tracking_url', $validated)) {
            $order->tracking_url = $validated['tracking_url'];
        }
        if (array_key_exists('notes', $validated)) {
            $order->notes = $validated['notes'];
        }

        $order->status = $newStatus;
        $order->tracking_steps = Order::buildDefaultTrackingSteps(
            $newStatus,
            $order->placed_at ? $order->placed_at->format('M d, h:i A') : now()->format('M d, h:i A'),
            $order->courier_name,
            $order->tracking_number
        );

        $order->save();

        return redirect()->back()->with('success', 'Order status updated successfully.');
    }

    public function destroy(Order $order): RedirectResponse
    {
        $order->delete();

        return redirect()->route('orders.index')->with('success', 'Order removed successfully.');
    }

    public function bulkUpdateStatus(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:orders,id',
            'status' => 'required|string|in:in_progress,processing,delivered,cancelled',
        ]);

        $orders = Order::whereIn('id', $validated['ids'])->get();
        foreach ($orders as $order) {
            $order->status = $validated['status'];
            if ($validated['status'] === 'delivered') {
                $order->delivered_at = now();
                $order->payment_status = 'paid';
            } elseif ($validated['status'] === 'cancelled' && $order->status !== 'cancelled') {
                $order->cancelled_at = now();
                foreach ($order->items as $item) {
                    if ($item->product_id) {
                        $prod = Product::find($item->product_id);
                        if ($prod && $prod->track_inventory) {
                            $prod->increment('stock_quantity', $item->quantity);
                        }
                    }
                }
            }
            $order->tracking_steps = Order::buildDefaultTrackingSteps(
                $validated['status'],
                $order->placed_at ? $order->placed_at->format('M d, h:i A') : now()->format('M d, h:i A'),
                $order->courier_name,
                $order->tracking_number
            );
            $order->save();
        }

        return redirect()->route('orders.index')->with('success', count($validated['ids']).' orders updated.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:orders,id',
        ]);

        Order::whereIn('id', $validated['ids'])->delete();

        return redirect()->route('orders.index')->with('success', count($validated['ids']).' orders deleted.');
    }
}
