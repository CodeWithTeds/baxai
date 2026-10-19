<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('staff')->after('email')->index();
            }
            if (! Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('role')->index();
            }
            if (! Schema::hasColumn('users', 'permissions')) {
                $table->json('permissions')->nullable()->after('is_active');
            }
        });

        // Set admin user to role 'admin'
        DB::table('users')
            ->where('username', 'admin')
            ->orWhere('email', 'like', 'admin%')
            ->update(['role' => 'admin', 'is_active' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'is_active', 'permissions']);
        });
    }
};
