<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePrintServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|unique:print_services,slug',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,inactive',
            'base_price' => 'required|numeric|min:0',
            'unit' => 'required|string|in:sq_ft,page,piece,meter',
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
