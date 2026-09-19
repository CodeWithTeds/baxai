<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'slug',
    'category',
    'description',
    'short_description',
    'badge',
    'status',
    'base_price',
    'compare_at_price',
    'unit',
    'sku',
    'stock_quantity',
    'low_stock_alert_at',
    'track_inventory',
    'thumbnail',
    'gallery_images',
    'has_3d_preview',
    'is_customizable',
    'viewer_type',
    'model_3d_url',
    'fallback_image',
    'allow_color_change',
    'available_colors',
    'allow_custom_text',
    'max_text_length',
    'allow_image_upload',
    'print_method',
    'print_size',
    'customization_addon_price',
    'has_variants',
    'is_featured_home',
    'is_featured_services',
    'sort_order',
])]
class Product extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $casts = [
        'base_price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'customization_addon_price' => 'decimal:2',
        'track_inventory' => 'boolean',
        'has_3d_preview' => 'boolean',
        'is_customizable' => 'boolean',
        'allow_color_change' => 'boolean',
        'allow_custom_text' => 'boolean',
        'allow_image_upload' => 'boolean',
        'has_variants' => 'boolean',
        'is_featured_home' => 'boolean',
        'is_featured_services' => 'boolean',
        'gallery_images' => 'array',
        'available_colors' => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCustomizable($query)
    {
        return $query->where('is_customizable', true);
    }

    public function getIsLowStockAttribute(): bool
    {
        if (! $this->track_inventory || is_null($this->low_stock_alert_at)) {
            return false;
        }

        return $this->stock_quantity <= $this->low_stock_alert_at;
    }
}
