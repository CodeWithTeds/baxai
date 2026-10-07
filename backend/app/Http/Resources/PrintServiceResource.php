<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrintServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'icon' => $this->icon,
            'status' => $this->status,
            'base_price' => (float) $this->base_price,
            'base_price_formatted' => '₱'.number_format((float) $this->base_price, 2),
            'unit' => $this->unit,
            'min_quantity' => $this->min_quantity,
            'max_file_size_mb' => $this->max_file_size_mb,
            'allowed_file_types' => $this->allowed_file_types ?? [],
            'rush_surcharge_type' => $this->rush_surcharge_type,
            'rush_surcharge_amount' => (float) $this->rush_surcharge_amount,
            'turnaround_time' => $this->turnaround_time,
            'rush_turnaround_time' => $this->rush_turnaround_time,
            'sort_order' => $this->sort_order,
            'specifications' => PrintServiceSpecificationResource::collection($this->whenLoaded('specifications')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
