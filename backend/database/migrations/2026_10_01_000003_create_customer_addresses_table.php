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
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->boolean('is_default')->default(true);
            $table->string('recipient_name')->nullable();
            $table->string('phone_number', 50)->nullable();

            // PSGC Hierarchy (stored as strings with leading zeros preserved)
            $table->string('region_code', 20)->index();
            $table->string('region_name');
            $table->string('province_code', 20)->index();
            $table->string('province_name');
            $table->string('city_code', 20)->index();
            $table->string('city_name');
            $table->string('barangay_code', 20)->index();
            $table->string('barangay_name');

            // Detailed address
            $table->text('street_address'); // Street / House / Building details
            $table->string('postal_code', 20)->nullable();
            $table->text('delivery_instructions')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['customer_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
