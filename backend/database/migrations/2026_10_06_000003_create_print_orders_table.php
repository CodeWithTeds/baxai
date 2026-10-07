<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('customer_address_id')->nullable()->constrained('customer_addresses')->nullOnDelete();
            $table->foreignId('service_id')->constrained('print_services')->cascadeOnDelete();
            $table->string('service_name');
            $table->json('specifications')->nullable();
            $table->string('file_url')->nullable();
            $table->string('file_name')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('file_type', 20)->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('rush_fee', 10, 2)->default(0);
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->string('fulfillment_type', 20)->default('delivery');
            $table->string('status', 30)->default('pending');
            $table->string('payment_method', 20)->default('cod');
            $table->string('payment_status', 20)->default('pending');
            $table->string('gcash_reference_number', 100)->nullable();
            $table->string('gcash_screenshot_url')->nullable();
            $table->string('courier_name', 100)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->string('tracking_url', 255)->nullable();
            $table->text('notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('customer_id');
            $table->index('service_id');
            $table->index('status');
            $table->index('payment_status');
            $table->index('fulfillment_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_orders');
    }
};
