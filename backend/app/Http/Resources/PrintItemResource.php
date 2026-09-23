<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrintItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'item_code' => $this->item_code,
            'category_id' => $this->category_id,
            'category' => new PrintCategoryResource($this->whenLoaded('category')),
            'description' => $this->description,
            'paper_type' => $this->paper_type,
            'paper_size' => $this->paper_size,
            'print_sides' => $this->print_sides?->value ?? $this->print_sides,
            'color_mode' => $this->color_mode?->value ?? $this->color_mode,
            'turnaround_time' => $this->turnaround_time,
            'base_price' => (float) $this->base_price,
            'min_quantity' => (int) $this->min_quantity,
            'status' => $this->status?->value ?? $this->status,
            'notes' => $this->notes,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
