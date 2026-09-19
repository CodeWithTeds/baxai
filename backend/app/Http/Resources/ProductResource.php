<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'category' => $this->category,
            'description' => $this->description,
            'short_description' => $this->short_description,
            'badge' => $this->badge,
            'status' => $this->status,
            'base_price' => $this->base_price,
            'compare_at_price' => $this->compare_at_price,
            'unit' => $this->unit,
            'sku' => $this->sku,
            'stock_quantity' => $this->stock_quantity,
            'low_stock_alert_at' => $this->low_stock_alert_at,
            'is_low_stock' => $this->when(! is_null($this->low_stock_alert_at), $this->is_low_stock),
            'track_inventory' => $this->track_inventory,
            'thumbnail' => $this->thumbnail,
            'gallery_images' => $this->gallery_images,
            'has_3d_preview' => $this->has_3d_preview,
            'is_customizable' => $this->is_customizable,
            'viewer_type' => $this->viewer_type,
            'model_3d_url' => $this->model_3d_url,
            'fallback_image' => $this->fallback_image,
            'allow_color_change' => $this->allow_color_change,
            'available_colors' => $this->available_colors,
            'allow_custom_text' => $this->allow_custom_text,
            'max_text_length' => $this->max_text_length,
            'allow_image_upload' => $this->allow_image_upload,
            'print_method' => $this->print_method,
            'print_size' => $this->print_size,
            'customization_addon_price' => $this->customization_addon_price,
            'has_variants' => $this->has_variants,
            'is_featured_home' => $this->is_featured_home,
            'is_featured_services' => $this->is_featured_services,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
