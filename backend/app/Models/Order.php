<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'order_number',
        'customer_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'status',
        'placed_at',
        'expected_delivery',
        'subtotal',
        'customization_total',
        'shipping_fee',
        'discount_total',
        'total',
        'payment_method',
        'payment_status',
        'tracking_steps',
        'shipping_address',
        'notes',
    ];

    protected $casts = [
        'placed_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'customization_total' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'total' => 'decimal:2',
        'tracking_steps' => 'array',
        'shipping_address' => 'array',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['in_progress', 'processing']);
    }

    public function scopePast($query)
    {
        return $query->whereIn('status', ['delivered', 'cancelled']);
    }

    /**
     * Default tracking steps generator based on status
     */
    public static function buildDefaultTrackingSteps(string $status, ?string $placedDate = null): array
    {
        $placedDateStr = $placedDate ?: now()->format('M d, h:i A');

        switch ($status) {
            case 'delivered':
                return [
                    ['label' => 'Order Placed', 'subtitle' => $placedDateStr, 'state' => 'done'],
                    ['label' => 'Production & Printing', 'subtitle' => 'Quality inspected', 'state' => 'done'],
                    ['label' => 'Shipped', 'subtitle' => 'Dispatched via Express Courier', 'state' => 'done'],
                    ['label' => 'Delivered', 'subtitle' => 'Package received & signed', 'state' => 'done'],
                ];
            case 'cancelled':
                return [
                    ['label' => 'Order Placed', 'subtitle' => $placedDateStr, 'state' => 'done'],
                    ['label' => 'Cancelled', 'subtitle' => 'Order was cancelled', 'state' => 'active'],
                    ['label' => 'Shipped', 'subtitle' => '', 'state' => 'pending'],
                    ['label' => 'Delivered', 'subtitle' => '', 'state' => 'pending'],
                ];
            case 'processing':
                return [
                    ['label' => 'Order Placed', 'subtitle' => $placedDateStr, 'state' => 'done'],
                    ['label' => 'Production & Printing', 'subtitle' => 'In active printing queue', 'state' => 'active'],
                    ['label' => 'Shipped', 'subtitle' => 'Pending pickup', 'state' => 'pending'],
                    ['label' => 'Delivered', 'subtitle' => 'Estimated soon', 'state' => 'pending'],
                ];
            case 'in_progress':
            default:
                return [
                    ['label' => 'Order Placed', 'subtitle' => $placedDateStr, 'state' => 'done'],
                    ['label' => 'Finishing & Packaging', 'subtitle' => 'Design proof verified', 'state' => 'active'],
                    ['label' => 'Shipped', 'subtitle' => 'Pending dispatch', 'state' => 'pending'],
                    ['label' => 'Delivered', 'subtitle' => 'On schedule', 'state' => 'pending'],
                ];
        }
    }
}
