<?php

namespace App\Http\Requests;

use App\Enums\PrintColorMode;
use App\Enums\PrintItemStatus;
use App\Enums\PrintSides;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePrintItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $itemId = $this->route('print_item') ? $this->route('print_item')->id : null;

        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'item_code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-]+$/', Rule::unique('print_items', 'item_code')->ignore($itemId)],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:print_categories,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'paper_type' => ['nullable', 'string', 'max:150'],
            'paper_size' => ['nullable', 'string', 'max:100'],
            'print_sides' => ['sometimes', 'required', 'string', Rule::in(PrintSides::values())],
            'color_mode' => ['sometimes', 'required', 'string', Rule::in(PrintColorMode::values())],
            'turnaround_time' => ['nullable', 'string', 'max:100'],
            'base_price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999.99'],
            'min_quantity' => ['sometimes', 'required', 'integer', 'min:1', 'max:100000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(PrintItemStatus::values())],
            'notes' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
