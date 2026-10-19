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
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('employee_id')->unique()->index();
            $table->string('department')->default('Management');
            $table->string('position')->default('Staff');
            $table->string('workstation')->nullable();
            $table->string('shift')->nullable()->default('Regular');
            $table->string('phone')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->date('hire_date')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Ensure default admin user has an initial staff profile
        $admin = DB::table('users')->where('username', 'admin')->first();
        if ($admin) {
            DB::table('staff_profiles')->insert([
                'user_id' => $admin->id,
                'employee_id' => 'STF-'.date('Y').'-001',
                'department' => 'Management',
                'position' => 'System Administrator',
                'workstation' => 'HQ Administration',
                'shift' => 'Regular',
                'is_active' => true,
                'hire_date' => now()->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_profiles');
    }
};
