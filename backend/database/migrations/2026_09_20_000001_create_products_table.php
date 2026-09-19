<?php

use App\Enums\ProductCategory;
use App\Enums\ProductStatus;
use App\Enums\ProductViewerType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category')->default(ProductCategory::OTHERS->value);
            $table->text('description')->nullable();
            $table->string('short_description', 255)->nullable();
            $table->string('badge', 50)->nullable();
            $table->string('status')->default(ProductStatus::default());
            $table->decimal('base_price', 10, 2);
            $table->decimal('compare_at_price', 10, 2)->nullable();
            $table->string('unit', 30)->default('piece');
            $table->string('sku')->unique();
            $table->integer('stock_quantity')->default(0);
            $table->integer('low_stock_alert_at')->nullable();
            $table->boolean('track_inventory')->default(true);
            $table->string('thumbnail')->nullable();
            $table->json('gallery_images')->nullable();
            $table->boolean('has_3d_preview')->default(false);
            $table->boolean('is_customizable')->default(false);
            $table->string('viewer_type')->default(ProductViewerType::default());
            $table->string('model_3d_url')->nullable();
            $table->string('fallback_image')->nullable();
            $table->boolean('allow_color_change')->default(false);
            $table->json('available_colors')->nullable();
            $table->boolean('allow_custom_text')->default(false);
            $table->integer('max_text_length')->nullable();
            $table->boolean('allow_image_upload')->default(false);
            $table->string('print_method', 100)->nullable();
            $table->string('print_size', 100)->nullable();
            $table->decimal('customization_addon_price', 10, 2)->nullable();
            $table->boolean('has_variants')->default(false);
            $table->boolean('is_featured_home')->default(false);
            $table->boolean('is_featured_services')->default(false);
            $table->integer('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'category']);
            $table->index('is_customizable');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
