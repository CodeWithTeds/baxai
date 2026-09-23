<?php

namespace App\Http\Requests;

use App\Enums\PrintColorMode;
use App\Enums\PrintItemStatus;
use App\Enums\PrintSides;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePrintItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'item_code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-]+$/', 'unique:print_items,item_code'],
            'category_id' => ['required', 'integer', 'exists:print_categories,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'paper_type' => ['nullable', 'string', 'max:150'],
            'paper_size' => ['nullable', 'string', 'max:100'],
            'print_sides' => ['required', 'string', Rule::in(PrintSides::values())],
            'color_mode' => ['required', 'string', Rule::in(PrintColorMode::values())],
            'turnaround_time' => ['nullable', 'string', 'max:100'],
            'base_price' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'min_quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'status' => ['required', 'string', Rule::in(PrintItemStatus::values())],
            'notes' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Print item name is required.',
            'category_id.required' => 'Please select a print category.',
            'category_id.exists' => 'Selected print category does not exist.',
            'base_price.required' => 'Base price is required.',
            'base_price.numeric' => 'Base price must be a valid numeric amount.',
            'min_quantity.required' => 'Minimum order quantity is required.',
            'item_code.unique' => 'This item code is already registered.',
        ];
    }
}
