<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            if (! Schema::hasColumn('customers', 'loyalty_points')) {
                $table->integer('loyalty_points')->default(0)->after('total_spent');
            }
            if (! Schema::hasColumn('customers', 'vip_tier')) {
                $table->string('vip_tier')->default('Bronze')->after('loyalty_points');
            }
        });

        Schema::create('vip_tiers', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('min_spend', 10, 2)->default(0.00);
            $table->decimal('points_multiplier', 4, 2)->default(1.00);
            $table->decimal('discount_percentage', 5, 2)->default(0.00);
            $table->text('perks')->nullable();
            $table->string('color')->default('emerald');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('rewards', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->integer('points_required')->default(100);
            $table->string('reward_type')->default('voucher'); // voucher, free_sample, tier_upgrade, express_production
            $table->decimal('discount_value', 10, 2)->default(0.00);
            $table->string('status')->default('active'); // active, inactive
            $table->integer('claims_count')->default(0);
            $table->integer('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'reward_type']);
            $table->index('code');
        });

        Schema::create('customer_rewards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('reward_id')->nullable()->constrained('rewards')->nullOnDelete();
            $table->string('reward_code');
            $table->integer('points_spent')->default(0);
            $table->string('status')->default('issued'); // issued, redeemed, expired
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_rewards');
        Schema::dropIfExists('rewards');
        Schema::dropIfExists('vip_tiers');

        Schema::table('customers', function (Blueprint $table): void {
            if (Schema::hasColumn('customers', 'loyalty_points')) {
                $table->dropColumn('loyalty_points');
            }
            if (Schema::hasColumn('customers', 'vip_tier')) {
                $table->dropColumn('vip_tier');
            }
        });
    }
};
