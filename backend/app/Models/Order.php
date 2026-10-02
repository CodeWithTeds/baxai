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
        'customer_address_id',
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
        'courier_name',
        'tracking_number',
        'tracking_url',
        'shipped_at',
        'delivered_at',
        'cancelled_at',
        'cancellation_reason',
        'tracking_steps',
        'shipping_address',
        'notes',
    ];

    protected $casts = [
        'placed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
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

    public function customerAddress(): BelongsTo
    {
        return $this->belongsTo(CustomerAddress::class, 'customer_address_id');
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
     * Default tracking steps generator based on status and courier details
     */
    public static function buildDefaultTrackingSteps(
        string $status,
        ?string $placedDate = null,
        ?string $courierName = null,
        ?string $trackingNumber = null
    ): array {
        $placedDateStr = $placedDate ?: now()->format('M d, h:i A');
        $courier = $courierName ?: 'J&T Express';
        $tracking = $trackingNumber ? " ({$trackingNumber})" : '';

        switch ($status) {
            case 'delivered':
                return [
                    ['label' => 'Order Placed', 'subtitle' => $placedDateStr, 'state' => 'done'],
                    ['label' => 'Production & Printing', 'subtitle' => 'Quality verified by Print Lab', 'state' => 'done'],
                    ['label' => 'Shipped', 'subtitle' => "Dispatched via {$courier}{$tracking}", 'state' => 'done'],
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
                    ['label' => 'Shipped', 'subtitle' => "Assigned to {$courier}{$tracking}", 'state' => 'pending'],
                    ['label' => 'Delivered', 'subtitle' => 'Estimated in 2-3 business days', 'state' => 'pending'],
                ];
            case 'in_progress':
            default:
                return [
                    ['label' => 'Order Placed', 'subtitle' => $placedDateStr, 'state' => 'done'],
                    ['label' => 'Finishing & Packaging', 'subtitle' => 'Design proof verified', 'state' => 'active'],
                    ['label' => 'Shipped', 'subtitle' => "Preparing for {$courier} dispatch", 'state' => 'pending'],
                    ['label' => 'Delivered', 'subtitle' => 'On schedule', 'state' => 'pending'],
                ];
        }
    }
}
