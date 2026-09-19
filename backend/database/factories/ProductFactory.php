<?php

namespace Database\Factories;

use App\Enums\ProductCategory;
use App\Enums\ProductStatus;
use App\Enums\ProductViewerType;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = $this->faker->words(3, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.$this->faker->unique()->randomNumber(5),
            'category' => $this->faker->randomElement(ProductCategory::values()),
            'description' => $this->faker->paragraph(),
            'short_description' => $this->faker->sentence(),
            'badge' => null,
            'status' => ProductStatus::ACTIVE->value,
            'base_price' => $this->faker->randomFloat(2, 1, 500),
            'compare_at_price' => null,
            'unit' => 'piece',
            'sku' => strtoupper(Str::random(8)),
            'stock_quantity' => $this->faker->numberBetween(0, 500),
            'low_stock_alert_at' => 20,
            'track_inventory' => true,
            'thumbnail' => null,
            'gallery_images' => null,
            'has_3d_preview' => false,
            'is_customizable' => false,
            'viewer_type' => ProductViewerType::NONE->value,
            'model_3d_url' => null,
            'fallback_image' => null,
            'allow_color_change' => false,
            'available_colors' => null,
            'allow_custom_text' => false,
            'max_text_length' => null,
            'allow_image_upload' => false,
            'print_method' => 'sublimation',
            'print_size' => null,
            'customization_addon_price' => null,
            'has_variants' => false,
            'is_featured_home' => false,
            'is_featured_services' => false,
            'sort_order' => 0,
        ];
    }

    public function customizable(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_customizable' => true,
            'has_3d_preview' => true,
            'viewer_type' => ProductViewerType::MUG->value,
            'allow_color_change' => true,
            'available_colors' => ['#FFFFFF', '#000000', '#2979E8'],
            'allow_custom_text' => true,
            'max_text_length' => 30,
            'allow_image_upload' => true,
        ]);
    }
}
