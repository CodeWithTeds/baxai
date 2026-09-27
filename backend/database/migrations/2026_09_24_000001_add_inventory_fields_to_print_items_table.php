<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('print_items', function (Blueprint $table) {
            $table->string('brand')->nullable()->after('paper_size');
            $table->string('model')->nullable()->after('brand');
            $table->integer('available_quantity')->default(0)->after('base_price');
            $table->string('unit')->nullable()->after('available_quantity');
            $table->string('compatibility')->nullable()->after('unit');
        });
    }

    public function down(): void
    {
        Schema::table('print_items', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'available_quantity', 'unit', 'compatibility']);
        });
    }
};
