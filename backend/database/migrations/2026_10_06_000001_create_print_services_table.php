<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('status')->default('active');
            $table->decimal('base_price', 10, 2)->default(0);
            $table->string('unit', 30)->default('piece');
            $table->integer('min_quantity')->default(1);
            $table->integer('max_file_size_mb')->default(100);
            $table->json('allowed_file_types')->nullable();
            $table->string('rush_surcharge_type', 20)->default('none');
            $table->decimal('rush_surcharge_amount', 10, 2)->default(0);
            $table->string('turnaround_time', 100)->nullable();
            $table->string('rush_turnaround_time', 100)->nullable();
            $table->integer('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index('status');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_services');
    }
};
