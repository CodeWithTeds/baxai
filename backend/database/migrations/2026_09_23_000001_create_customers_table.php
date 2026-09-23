<?php

use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('customer_code')->unique();
            $table->string('email')->unique();
            $table->string('phone', 50)->nullable();
            $table->string('company')->nullable();
            $table->string('status')->default(CustomerStatus::default());
            $table->string('type')->default(CustomerType::default());
            $table->string('avatar')->nullable();
            $table->text('notes')->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('postal_code', 30)->nullable();
            $table->string('country', 100)->default('Philippines');
            $table->integer('total_orders')->default(0);
            $table->decimal('total_spent', 10, 2)->default(0.00);
            $table->integer('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'type']);
            $table->index('customer_code');
            $table->index('email');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
