<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerReward;
use App\Models\Discount;
use App\Models\Reward;
use App\Models\VipTier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class PromotionsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Discounts & Coupons
        $discounts = [
            [
                'code' => 'PRINT10',
                'name' => '10% Off All Printing Orders',
                'description' => 'Standard welcome discount code for custom print jobs and merchandise.',
                'type' => 'percentage',
                'value' => 10.00,
                'min_order_amount' => 500.00,
                'max_discount_amount' => 1000.00,
                'applicable_category' => 'All Services',
                'usage_limit' => 100,
                'used_count' => 34,
                'start_date' => Carbon::now()->subDays(30),
                'end_date' => Carbon::now()->addDays(60),
                'status' => 'active',
                'sort_order' => 1,
            ],
            [
                'code' => 'BULK500',
                'name' => '₱500 Off Large Corporate Orders',
                'description' => 'Flat savings on orders exceeding ₱5,000 for uniforms, banners, and business cards.',
                'type' => 'fixed_amount',
                'value' => 500.00,
                'min_order_amount' => 5000.00,
                'max_discount_amount' => 500.00,
                'applicable_category' => 'Apparel & Uniforms',
                'usage_limit' => 50,
                'used_count' => 12,
                'start_date' => Carbon::now()->subDays(15),
                'end_date' => Carbon::now()->addDays(45),
                'status' => 'active',
                'sort_order' => 2,
            ],
            [
                'code' => 'FREESHIP',
                'name' => 'Free Courier Delivery Nationwide',
                'description' => 'Waives standard shipping costs for orders above ₱1,500.',
                'type' => 'free_shipping',
                'value' => 150.00,
                'min_order_amount' => 1500.00,
                'max_discount_amount' => 250.00,
                'applicable_category' => 'All Services',
                'usage_limit' => 200,
                'used_count' => 88,
                'start_date' => Carbon::now()->subDays(10),
                'end_date' => Carbon::now()->addDays(90),
                'status' => 'active',
                'sort_order' => 3,
            ],
            [
                'code' => 'VIPPLUS20',
                'name' => '20% Off VIP Corporate Event Package',
                'description' => 'Exclusive promo code for VIP tier members ordering event merchandise.',
                'type' => 'percentage',
                'value' => 20.00,
                'min_order_amount' => 10000.00,
                'max_discount_amount' => 5000.00,
                'applicable_category' => 'Corporate Gifts',
                'usage_limit' => 25,
                'used_count' => 5,
                'start_date' => Carbon::now()->subDays(5),
                'end_date' => Carbon::now()->addDays(30),
                'status' => 'active',
                'sort_order' => 4,
            ],
            [
                'code' => 'MUGSUMMER',
                'name' => '15% Off Sublimation Mugs',
                'description' => 'Seasonal promo code targeting drinkware and ceramic mug orders.',
                'type' => 'percentage',
                'value' => 15.00,
                'min_order_amount' => 800.00,
                'max_discount_amount' => 750.00,
                'applicable_category' => 'Mugs & Drinkware',
                'usage_limit' => 60,
                'used_count' => 60,
                'start_date' => Carbon::now()->subDays(60),
                'end_date' => Carbon::now()->subDays(5),
                'status' => 'expired',
                'sort_order' => 5,
            ],
        ];

        foreach ($discounts as $d) {
            Discount::updateOrCreate(['code' => $d['code']], $d);
        }

        // 2. Seed VIP Tiers
        $tiers = [
            [
                'name' => 'Bronze',
                'min_spend' => 0.00,
                'points_multiplier' => 1.00,
                'discount_percentage' => 0.00,
                'perks' => 'Standard support, 1 point per ₱10 spent, access to digital proof previews.',
                'color' => 'amber',
                'sort_order' => 1,
            ],
            [
                'name' => 'Silver',
                'min_spend' => 5000.00,
                'points_multiplier' => 1.25,
                'discount_percentage' => 3.00,
                'perks' => '3% baseline discount, 1.25x points boost, free digital color matching.',
                'color' => 'slate',
                'sort_order' => 2,
            ],
            [
                'name' => 'Gold',
                'min_spend' => 15000.00,
                'points_multiplier' => 1.50,
                'discount_percentage' => 5.00,
                'perks' => '5% baseline discount, 1.5x points boost, priority 24h printing queue, free sample print.',
                'color' => 'yellow',
                'sort_order' => 3,
            ],
            [
                'name' => 'Platinum',
                'min_spend' => 50000.00,
                'points_multiplier' => 2.00,
                'discount_percentage' => 10.00,
                'perks' => '10% baseline discount, 2.0x points boost, dedicated account manager, free expedited delivery.',
                'color' => 'blue',
                'sort_order' => 4,
            ],
            [
                'name' => 'VIP Diamond',
                'min_spend' => 100000.00,
                'points_multiplier' => 3.00,
                'discount_percentage' => 15.00,
                'perks' => '15% baseline discount, 3.0x points boost, unlimited free proofing samples, same-day rush production.',
                'color' => 'purple',
                'sort_order' => 5,
            ],
        ];

        foreach ($tiers as $t) {
            VipTier::updateOrCreate(['name' => $t['name']], $t);
        }

        // 3. Seed Redeemable Rewards Catalog
        $rewards = [
            [
                'title' => '₱200 Printing Services Voucher',
                'code' => 'RWD-PRINT200',
                'description' => 'Redeem 200 loyalty points for a ₱200 discount code applicable on any printing service.',
                'points_required' => 200,
                'reward_type' => 'voucher',
                'discount_value' => 200.00,
                'status' => 'active',
                'claims_count' => 18,
                'sort_order' => 1,
            ],
            [
                'title' => 'Free Sublimation Mug Sample Proof',
                'code' => 'RWD-MUGPROOF',
                'description' => 'Get 1 free physical printed mug sample proof before initiating bulk production.',
                'points_required' => 350,
                'reward_type' => 'free_sample',
                'discount_value' => 250.00,
                'status' => 'active',
                'claims_count' => 9,
                'sort_order' => 2,
            ],
            [
                'title' => 'Express 24-Hour Production Upgrade',
                'code' => 'RWD-RUSH24H',
                'description' => 'Bypass standard queue waiting times and get your print job moved to 24h express production.',
                'points_required' => 500,
                'reward_type' => 'express_production',
                'discount_value' => 400.00,
                'status' => 'active',
                'claims_count' => 14,
                'sort_order' => 3,
            ],
            [
                'title' => '₱1,000 Bulk Order Reward Credit',
                'code' => 'RWD-BULK1000',
                'description' => 'Redeem 900 points for a high-value ₱1,000 credit voucher on bulk t-shirt and banner printing.',
                'points_required' => 900,
                'reward_type' => 'voucher',
                'discount_value' => 1000.00,
                'status' => 'active',
                'claims_count' => 6,
                'sort_order' => 4,
            ],
        ];

        foreach ($rewards as $r) {
            Reward::updateOrCreate(['code' => $r['code']], $r);
        }

        // 4. Update existing customers with points and VIP tiers
        $customers = Customer::all();
        foreach ($customers as $index => $customer) {
            $spent = (float) $customer->total_spent;
            $tier = 'Bronze';
            if ($spent >= 100000) {
                $tier = 'VIP Diamond';
            } elseif ($spent >= 50000) {
                $tier = 'Platinum';
            } elseif ($spent >= 15000) {
                $tier = 'Gold';
            } elseif ($spent >= 5000) {
                $tier = 'Silver';
            }

            $points = (int) ($spent / 10) + ($index * 120);

            $customer->update([
                'loyalty_points' => $points,
                'vip_tier' => $tier,
            ]);

            // Create sample customer reward claims
            if ($index < 3) {
                $reward = Reward::first();
                if ($reward) {
                    CustomerReward::create([
                        'customer_id' => $customer->id,
                        'reward_id' => $reward->id,
                        'reward_code' => 'CLAIM-'.strtoupper(substr(md5(uniqid()), 0, 8)),
                        'points_spent' => $reward->points_required,
                        'status' => 'issued',
                        'issued_at' => Carbon::now()->subDays($index * 2),
                    ]);
                }
            }
        }
    }
}
