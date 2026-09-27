<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\VipTier;
use Illuminate\Http\Request;

class RewardController extends Controller
{
    public function catalog()
    {
        return response()->json([
            'success' => true,
            'data' => Reward::active()->orderBy('sort_order')->get(),
        ]);
    }

    public function vipTiers()
    {
        return response()->json([
            'success' => true,
            'data' => VipTier::orderBy('sort_order')->get(),
        ]);
    }

    public function customerPoints(Request $request, int $customerId)
    {
        $customer = Customer::with('customerRewards.reward')->findOrFail($customerId);

        return response()->json([
            'success' => true,
            'data' => [
                'customer_id' => $customer->id,
                'name' => $customer->name,
                'customer_code' => $customer->customer_code,
                'loyalty_points' => $customer->loyalty_points,
                'vip_tier' => $customer->vip_tier,
                'total_spent' => (float) $customer->total_spent,
                'rewards_history' => $customer->customerRewards,
            ],
        ]);
    }
}
