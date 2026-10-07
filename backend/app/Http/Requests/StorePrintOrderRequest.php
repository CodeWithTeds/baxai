<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePrintOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => 'required|integer|exists:print_services,id',
            'specifications' => 'nullable|array',
            'quantity' => 'required|integer|min:1',
            'fulfillment_type' => 'required|in:delivery,pickup',
            'customer_address_id' => 'required_if:fulfillment_type,delivery|nullable|integer|exists:customer_addresses,id',
            'payment_method' => 'required|in:cod,gcash',
            'gcash_reference_number' => 'required_if:payment_method,gcash|nullable|string|max:100',
            'gcash_screenshot' => 'required_if:payment_method,gcash|nullable|image|mimes:png,jpg,jpeg|max:5120',
            'is_rush' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:1000',
            'file' => 'required|file|max:102400',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Please upload a file to print.',
            'file.max' => 'File size must not exceed 100MB.',
            'gcash_reference_number.required_if' => 'GCash reference number is required for GCash payments.',
            'gcash_screenshot.required_if' => 'Please upload a screenshot of your GCash payment.',
            'customer_address_id.required_if' => 'Please select a delivery address.',
        ];
    }
}
