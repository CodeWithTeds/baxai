<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PrintOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'customer_id',
        'customer_address_id',
        'service_id',
        'service_name',
        'specifications',
        'file_url',
        'file_name',
        'file_size',
        'file_type',
        'quantity',
        'unit_price',
        'subtotal',
        'rush_fee',
        'shipping_fee',
        'total',
        'fulfillment_type',
        'status',
        'payment_method',
        'payment_status',
        'gcash_reference_number',
        'gcash_screenshot_url',
        'courier_name',
        'tracking_number',
        'tracking_url',
        'notes',
        'admin_notes',
        'placed_at',
        'shipped_at',
        'delivered_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'specifications' => 'array',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'rush_fee' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'quantity' => 'integer',
        'file_size' => 'integer',
        'placed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerAddress(): BelongsTo
    {
        return $this->belongsTo(CustomerAddress::class, 'customer_address_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(PrintService::class, 'service_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'in_production', 'ready']);
    }

    public function scopePast($query)
    {
        return $query->whereIn('status', ['delivered', 'picked_up', 'cancelled']);
    }

    public function isCancellable(): bool
    {
        return $this->status === 'pending';
    }

    public function isPickup(): bool
    {
        return $this->fulfillment_type === 'pickup';
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }
}
