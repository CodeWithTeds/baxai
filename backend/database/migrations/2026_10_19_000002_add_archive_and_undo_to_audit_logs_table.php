<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->softDeletes()->after('updated_at');
            $table->boolean('is_undone')->default(false)->after('severity');
            $table->timestamp('undone_at')->nullable()->after('is_undone');
            $table->foreignId('undone_by_id')->nullable()->after('undone_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropForeign(['undone_by_id']);
            $table->dropColumn(['is_undone', 'undone_at', 'undone_by_id', 'deleted_at']);
        });
    }
};
