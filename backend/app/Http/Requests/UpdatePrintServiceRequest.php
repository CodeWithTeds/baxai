<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrintServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $serviceId = $this->route('service');

        return [
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:print_services,slug,'.$serviceId,
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,inactive',
            'base_price' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string|in:sq_ft,page,piece,meter',
            'min_quantity' => 'sometimes|integer|min:1',
            'max_file_size_mb' => 'sometimes|integer|min:1',
            'allowed_file_types' => 'nullable|array',
            'rush_surcharge_type' => 'sometimes|in:percentage,fixed,none',
            'rush_surcharge_amount' => 'sometimes|numeric|min:0',
            'turnaround_time' => 'nullable|string|max:100',
            'rush_turnaround_time' => 'nullable|string|max:100',
            'sort_order' => 'sometimes|integer',
        ];
    }
}
