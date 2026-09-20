<?php

namespace App\Http\Requests\Api\Concerns;

trait ProductValidationMessages
{
    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a product name.',
            'category.required' => 'Please choose a category.',
            'status.required' => 'Please choose a status.',
            'base_price.required' => 'Please enter a base price.',
            'base_price.numeric' => 'Base price must be a number.',
            'base_price.min' => 'Base price cannot be negative.',
            'compare_at_price.gt' => 'Compare-at price must be higher than the base price.',
            'sku.unique' => 'This SKU is already used by another product.',
            'slug.unique' => 'This slug is already taken.',
            'thumbnail.max' => 'Thumbnail URL is too long.',
            'reference_image.image' => 'The reference must be an image file.',
            'reference_image.mimes' => 'The reference must be a JPG, PNG or WebP image.',
            'reference_image.max' => 'The reference image must be 5 MB or smaller.',
            'gallery_images.max' => 'You can attach up to 5 gallery images.',
            'viewer_type.enum' => 'Please choose a valid 3D viewer.',
            'model_3d_url.required_if' => 'A model URL is required for custom .glb models.',
            'max_text_length.required_if' => 'Max text length is required when custom text is allowed.',
            'max_text_length.min' => 'Max text length must be at least 1 character.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'short_description' => 'short description',
            'base_price' => 'base price',
            'compare_at_price' => 'compare-at price',
            'stock_quantity' => 'stock quantity',
            'low_stock_alert_at' => 'low stock alert',
            'track_inventory' => 'track inventory',
            'gallery_images' => 'gallery images',
            'has_3d_preview' => '3D preview',
            'is_customizable' => 'customizable',
            'viewer_type' => '3D viewer',
            'model_3d_url' => '3D model URL',
            'fallback_image' => 'fallback image',
            'allow_color_change' => 'color choices',
            'available_colors' => 'available colors',
            'allow_custom_text' => 'custom text',
            'max_text_length' => 'max text length',
            'allow_image_upload' => 'image upload',
            'print_method' => 'print method',
            'print_size' => 'print size',
            'customization_addon_price' => 'add-on price',
            'has_variants' => 'variants',
            'is_featured_home' => 'featured home',
            'is_featured_services' => 'featured services',
            'sort_order' => 'sort order',
            'reference_image' => 'reference image',
        ];
    }
}
