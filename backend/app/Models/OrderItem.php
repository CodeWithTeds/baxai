<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'category',
        'sku',
        'banner_image',
        'viewer_type',
        'selected_color',
        'selected_color_name',
        'selected_size',
        'customization',
        'base_price',
        'addon_price',
        'unit_price',
        'quantity',
        'total_price',
    ];

    protected $casts = [
        'customization' => 'array',
        'base_price' => 'decimal:2',
        'addon_price' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
