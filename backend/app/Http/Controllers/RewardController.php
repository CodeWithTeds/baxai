<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerReward;
use App\Models\Reward;
use App\Models\VipTier;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RewardController extends Controller
{
    public function index(Request $request): Response
    {
        $activeTab = $request->input('tab', 'catalog'); // catalog, tiers, customers, redemptions

        // 1. Rewards Catalog
        $rewards = Reward::orderBy('sort_order', 'asc')->get();

        // 2. VIP Tiers
        $vipTiers = VipTier::orderBy('sort_order', 'asc')->get();

        // 3. Customer Loyalty Ledger (Paginated)
        $customerQuery = Customer::query();
        $search = $request->input('search');
        $tier = $request->input('tier');

        if ($search) {
            $customerQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('customer_code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%");
            });
        }

        if ($tier && $tier !== 'all') {
            $customerQuery->where('vip_tier', $tier);
        }

        $customers = $customerQuery->orderBy('loyalty_points', 'desc')
            ->paginate(10, ['*'], 'customers_page')
            ->withQueryString();

        // 4. Redemptions Log (Paginated)
        $redemptions = CustomerReward::with(['customer', 'reward'])
            ->orderBy('created_at', 'desc')
            ->paginate(10, ['*'], 'redemptions_page')
            ->withQueryString();

        // Summary Stats
        $stats = [
            'total_points_distributed' => (int) Customer::sum('loyalty_points'),
            'active_vip_members' => Customer::where('vip_tier', '!=', 'Bronze')->count(),
            'total_claims' => (int) Reward::sum('claims_count'),
            'total_rewards' => Reward::count(),
        ];

        return Inertia::render('rewards/index', [
            'rewards' => $rewards,
            'vipTiers' => $vipTiers,
            'customers' => $customers,
            'redemptions' => $redemptions,
            'stats' => $stats,
            'activeTab' => $activeTab,
            'filters' => $request->all(),
        ]);
    }

    public function storeReward(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:rewards,code',
            'description' => 'nullable|string',
            'points_required' => 'required|integer|min:1',
            'reward_type' => 'required|string|in:voucher,free_sample,tier_upgrade,express_production',
            'discount_value' => 'nullable|numeric|min:0',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        Reward::create($validated);

        return redirect()->back()->with('flash', [
            'success' => "Reward perk '{$validated['title']}' created successfully.",
        ]);
    }

    public function updateReward(Request $request, Reward $reward)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:rewards,code,'.$reward->id,
            'description' => 'nullable|string',
            'points_required' => 'required|integer|min:1',
            'reward_type' => 'required|string|in:voucher,free_sample,tier_upgrade,express_production',
            'discount_value' => 'nullable|numeric|min:0',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $reward->update($validated);

        return redirect()->back()->with('flash', [
            'success' => "Reward perk '{$reward->title}' updated successfully.",
        ]);
    }

    public function destroyReward(Reward $reward)
    {
        $title = $reward->title;
        $reward->delete();

        return redirect()->back()->with('flash', [
            'success' => "Reward perk '{$title}' archived successfully.",
        ]);
    }

    public function adjustPoints(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'points' => 'required|integer',
            'reason' => 'nullable|string',
        ]);

        $customer = Customer::findOrFail($validated['customer_id']);
        $newBalance = max(0, $customer->loyalty_points + $validated['points']);

        // Check if new balance qualifies customer for a higher VIP Tier
        $tier = 'Bronze';
        $spent = (float) $customer->total_spent;
        if ($spent >= 100000) {
            $tier = 'VIP Diamond';
        } elseif ($spent >= 50000) {
            $tier = 'Platinum';
        } elseif ($spent >= 15000) {
            $tier = 'Gold';
        } elseif ($spent >= 5000) {
            $tier = 'Silver';
        }

        $customer->update([
            'loyalty_points' => $newBalance,
            'vip_tier' => $tier,
        ]);

        $msg = $validated['points'] >= 0 ? "Added {$validated['points']} points to {$customer->name}." : 'Deducted '.abs($validated['points'])." points from {$customer->name}.";

        return redirect()->back()->with('flash', [
            'success' => $msg,
        ]);
    }

    public function issueReward(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'reward_id' => 'required|exists:rewards,id',
        ]);

        $customer = Customer::findOrFail($validated['customer_id']);
        $reward = Reward::findOrFail($validated['reward_id']);

        if ($customer->loyalty_points < $reward->points_required) {
            return redirect()->back()->with('flash', [
                'error' => "Customer does not have enough points. Required: {$reward->points_required}, Available: {$customer->loyalty_points}",
            ]);
        }

        // Deduct points
        $customer->decrement('loyalty_points', $reward->points_required);

        // Increment claims
        $reward->increment('claims_count');

        // Create claim record
        $code = 'CLAIM-'.strtoupper(substr(md5(uniqid()), 0, 8));
        CustomerReward::create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'reward_code' => $code,
            'points_spent' => $reward->points_required,
            'status' => 'issued',
            'issued_at' => now(),
        ]);

        return redirect()->back()->with('flash', [
            'success' => "Reward '{$reward->title}' successfully issued to {$customer->name}. Voucher code: {$code}",
        ]);
    }

    public function updateVipTier(Request $request, VipTier $vipTier)
    {
        $validated = $request->validate([
            'min_spend' => 'required|numeric|min:0',
            'points_multiplier' => 'required|numeric|min:1',
            'discount_percentage' => 'required|numeric|min:0|max:100',
            'perks' => 'nullable|string',
        ]);

        $vipTier->update($validated);

        return redirect()->back()->with('flash', [
            'success' => "VIP Tier '{$vipTier->name}' updated successfully.",
        ]);
    }
}
