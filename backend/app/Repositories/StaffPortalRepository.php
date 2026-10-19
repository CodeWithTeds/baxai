<?php

namespace App\Repositories;

use App\Enums\StaffFulfillmentStatusEnum;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PrintItem;
use App\Models\Product;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;

class StaffPortalRepository implements StaffPortalRepositoryInterface
{
    /**
     * Get aggregated workspace data for the authenticated staff user.
     */
    public function getStaffWorkspaceData(User $user): array
    {
        $profile = $user->staffProfile;

        // Active fulfillment queue: in_progress and processing first, then recent delivered
        $orders = Order::with(['items', 'customer'])
            ->whereIn('status', [
                StaffFulfillmentStatusEnum::IN_PROGRESS->value,
                StaffFulfillmentStatusEnum::PROCESSING->value,
                StaffFulfillmentStatusEnum::DELIVERED->value,
            ])
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 1 WHEN status = 'processing' THEN 2 ELSE 3 END")
            ->latest('created_at')
            ->take(30)
            ->get()
            ->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'customer_phone' => $order->customer_phone,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'payment_method' => $order->payment_method,
                    'total' => (float) $order->total,
                    'items_count' => $order->items->count(),
                    'items_summary' => $order->items->map(fn ($item) => [
                        'id' => $item->id,
                        'name' => $item->product_name ?? 'Print Item',
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                    ]),
                    'placed_at' => $order->placed_at ? $order->placed_at->format('M d, Y h:i A') : $order->created_at->format('M d, Y h:i A'),
                    'shipping_address' => $order->shipping_address,
                    'notes' => $order->notes,
                ];
            });

        // Fulfillment queue counters
        $inProgressCount = Order::where('status', StaffFulfillmentStatusEnum::IN_PROGRESS->value)->count();
        $processingCount = Order::where('status', StaffFulfillmentStatusEnum::PROCESSING->value)->count();
        $deliveredTodayCount = Order::where('status', StaffFulfillmentStatusEnum::DELIVERED->value)
            ->whereDate('updated_at', Carbon::today())
            ->count();

        // Low stock alerts
        $lowStockItems = Product::where('stock_quantity', '<=', 10)
            ->orderBy('stock_quantity', 'asc')
            ->take(8)
            ->get(['id', 'name', 'sku', 'category', 'stock_quantity', 'status']);

        // Quick inventory materials
        $stockMaterials = PrintItem::with('category')
            ->latest()
            ->take(6)
            ->get(['id', 'name', 'item_code', 'base_price', 'status']);

        // Tasks assigned to this staff member
        $tasks = Task::where('user_id', $user->id)
            ->latest()
            ->get(['id', 'title', 'description', 'status', 'created_at']);

        return [
            'staff_info' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'employee_id' => $profile?->employee_id ?? 'STF-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
                'department' => $profile?->department ?? 'Order Fulfillment & Packing',
                'position' => $profile?->position ?? 'Fulfillment Staff',
                'workstation' => $profile?->workstation ?? 'Packing Station #1',
                'shift' => $profile?->shift ?? 'Regular (8:00 AM - 5:00 PM)',
                'phone' => $profile?->phone,
            ],
            'metrics' => [
                'in_progress' => $inProgressCount,
                'processing' => $processingCount,
                'delivered_today' => $deliveredTodayCount,
                'low_stock_count' => $lowStockItems->count(),
            ],
            'orders' => $orders,
            'low_stock_items' => $lowStockItems,
            'stock_materials' => $stockMaterials,
            'tasks' => $tasks,
        ];
    }

    /**
     * Update order status during fulfillment.
     */
    public function updateOrderStatus(int $orderId, string $status): bool
    {
        $order = Order::find($orderId);
        if (! $order) {
            return false;
        }

        $order->status = $status;
        if ($status === StaffFulfillmentStatusEnum::DELIVERED->value && ! $order->delivered_at) {
            $order->delivered_at = Carbon::now();
        }

        $saved = $order->save();

        if ($saved) {
            AuditLog::record(
                action: 'order.fulfillment_update',
                description: "Staff updated Order #{$order->order_number} status to [{$status}].",
                module: 'Orders',
                severity: 'info',
                actor: auth()->user()
            );
        }

        return $saved;
    }

    /**
     * Toggle or update task completion status.
     */
    public function toggleTaskStatus(int $taskId, int $userId): bool
    {
        $task = Task::where('id', $taskId)->where('user_id', $userId)->first();
        if (! $task) {
            return false;
        }

        $newStatus = $task->status === 'completed' ? 'pending' : 'completed';
        $task->status = $newStatus;

        return $task->save();
    }

    /**
     * Create a workstation task for staff member.
     */
    public function createTask(User $user, array $data): Task
    {
        return Task::create([
            'user_id' => $user->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => 'pending',
        ]);
    }
}
