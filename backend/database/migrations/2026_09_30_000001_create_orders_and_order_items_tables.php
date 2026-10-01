<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable()->index();
            $table->string('customer_phone')->nullable();
            $table->enum('status', ['in_progress', 'processing', 'delivered', 'cancelled'])->default('in_progress');
            $table->timestamp('placed_at')->useCurrent();
            $table->string('expected_delivery')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('customization_total', 10, 2)->default(0);
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->decimal('discount_total', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->string('payment_method')->default('Cash on Delivery');
            $table->string('payment_status')->default('pending');
            $table->json('tracking_steps')->nullable();
            $table->json('shipping_address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');
            $table->string('category')->nullable();
            $table->string('sku')->nullable();
            $table->string('banner_image')->nullable();
            $table->string('viewer_type')->nullable();
            $table->string('selected_color')->nullable();
            $table->string('selected_color_name')->nullable();
            $table->string('selected_size')->nullable();
            $table->json('customization')->nullable();
            $table->decimal('base_price', 10, 2)->default(0);
            $table->decimal('addon_price', 10, 2)->default(0);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('total_price', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
