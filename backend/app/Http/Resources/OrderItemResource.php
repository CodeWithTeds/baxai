<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'name' => $this->product_name,
            'category' => $this->category,
            'sku' => $this->sku,
            'banner_image' => $this->banner_image,
            'viewer_type' => $this->viewer_type,
            'selected_color' => $this->selected_color,
            'selected_color_name' => $this->selected_color_name,
            'selected_size' => $this->selected_size,
            'customization' => $this->customization ?? [],
            'base_price' => (float) $this->base_price,
            'addon_price' => (float) $this->addon_price,
            'unit_price' => (float) $this->unit_price,
            'price' => '₱'.number_format((float) $this->unit_price, 2),
            'quantity' => (int) $this->quantity,
            'qty' => (int) $this->quantity,
            'total_price' => (float) $this->total_price,
            'total' => '₱'.number_format((float) $this->total_price, 2),
        ];
    }
}
