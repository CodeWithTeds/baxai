<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrintOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:pending,in_production,ready,shipped,delivered,picked_up,cancelled',
            'notes' => 'nullable|string|max:1000',
            'courier_name' => 'nullable|string|max:100',
            'tracking_number' => 'nullable|string|max:100',
        ];
    }
}
