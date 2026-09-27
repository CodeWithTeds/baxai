<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discounts', function (Blueprint $table): void {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type')->default('percentage'); // percentage, fixed_amount, free_shipping, bulk_print
            $table->decimal('value', 10, 2)->default(0.00);
            $table->decimal('min_order_amount', 10, 2)->default(0.00);
            $table->decimal('max_discount_amount', 10, 2)->nullable();
            $table->string('applicable_category')->nullable()->default('All Services');
            $table->integer('usage_limit')->nullable();
            $table->integer('used_count')->default(0);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->string('status')->default('active'); // active, scheduled, expired, disabled
            $table->integer('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'type']);
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discounts');
    }
};
