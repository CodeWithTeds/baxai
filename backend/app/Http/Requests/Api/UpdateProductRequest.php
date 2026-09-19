<?php

namespace App\Http\Requests\Api;

use App\Enums\ProductCategory;
use App\Enums\ProductStatus;
use App\Enums\ProductViewerType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $id = $this->route('product')?->id ?? $this->route('product');

        return [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug,'.$id,
            'category' => ['sometimes', Rule::enum(ProductCategory::class)],
            'description' => 'nullable|string|max:5000',
            'short_description' => 'nullable|string|max:255',
            'badge' => 'nullable|string|max:50',
            'status' => ['sometimes', Rule::enum(ProductStatus::class)],
            'base_price' => 'sometimes|required|numeric|min:0|max:999999.99',
            'compare_at_price' => 'nullable|numeric|min:0|max:999999.99',
            'unit' => 'nullable|string|max:30',
            'sku' => 'sometimes|string|max:100|unique:products,sku,'.$id,
            'stock_quantity' => 'nullable|integer|min:-1',
            'low_stock_alert_at' => 'nullable|integer|min:0',
            'track_inventory' => 'boolean',
            'thumbnail' => 'nullable|string|max:2048',
            'gallery_images' => 'nullable|array|max:5',
            'gallery_images.*' => 'string|max:2048',
            'has_3d_preview' => 'boolean',
            'is_customizable' => 'boolean',
            'viewer_type' => ['nullable', Rule::enum(ProductViewerType::class)],
            'model_3d_url' => 'nullable|string|max:2048',
            'fallback_image' => 'nullable|string|max:2048',
            'allow_color_change' => 'boolean',
            'available_colors' => 'nullable|array|max:20',
            'available_colors.*' => 'string|max:30',
            'allow_custom_text' => 'boolean',
            'max_text_length' => 'nullable|integer|min:1|max:500',
            'allow_image_upload' => 'boolean',
            'print_method' => 'nullable|string|max:100',
            'print_size' => 'nullable|string|max:100',
            'customization_addon_price' => 'nullable|numeric|min:0|max:999999.99',
            'has_variants' => 'boolean',
            'is_featured_home' => 'boolean',
            'is_featured_services' => 'boolean',
            'sort_order' => 'nullable|integer|min:0|max:9999',
        ];
    }
}
