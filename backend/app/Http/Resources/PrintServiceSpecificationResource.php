<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrintServiceSpecificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'options' => $this->options ?? [],
            'is_required' => $this->is_required,
            'sort_order' => $this->sort_order,
        ];
    }
}
