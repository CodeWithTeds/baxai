<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_service_specifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained('print_services')->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 20)->default('select');
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('service_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_service_specifications');
    }
};
