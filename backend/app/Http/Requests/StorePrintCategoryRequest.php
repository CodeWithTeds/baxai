<?php

namespace App\Http\Requests;

use App\Enums\PrintCategoryStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePrintCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-]+$/', 'unique:print_categories,code'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:print_categories,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'string', Rule::in(PrintCategoryStatus::values())],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Category name is required.',
            'code.unique' => 'This category code is already in use.',
            'code.regex' => 'Category code can only contain letters, numbers, hyphens, and underscores.',
        ];
    }
}
