<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('print_categories')->nullOnDelete();
            $table->string('name');
            $table->string('item_code')->unique();
            $table->text('description')->nullable();
            $table->string('paper_type')->nullable();
            $table->string('paper_size')->nullable();
            $table->string('print_sides')->default('single_sided');
            $table->string('color_mode')->default('full_color');
            $table->string('turnaround_time')->default('1-2 Business Days');
            $table->decimal('base_price', 10, 2)->default(0.00);
            $table->integer('min_quantity')->default(1);
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_id');
            $table->index('status');
            $table->index('print_sides');
            $table->index('color_mode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_items');
    }
};
