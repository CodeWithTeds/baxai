<?php

namespace App\Http\Requests;

use App\Enums\PrintCategoryStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePrintCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('print_category') ? $this->route('print_category')->id : null;

        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-]+$/', Rule::unique('print_categories', 'code')->ignore($categoryId)],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('print_categories', 'slug')->ignore($categoryId)],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', 'required', 'string', Rule::in(PrintCategoryStatus::values())],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
