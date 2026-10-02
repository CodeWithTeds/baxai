<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use Illuminate\Http\Request;

class DiscountController extends Controller
{
    public function index(Request $request)
    {
        $query = Discount::query()->active();

        if ($request->has('category')) {
            $cat = $request->input('category');
            $query->where(function ($q) use ($cat) {
                $q->where('applicable_category', $cat)
                    ->orWhere('applicable_category', 'All Services')
                    ->orWhereNull('applicable_category');
            });
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('sort_order')->get(),
        ]);
    }

    public function validateCode(Request $request)
    {
        $code = strtoupper(trim($request->input('code', '')));
        $orderAmount = (float) $request->input('order_amount', 0);

        $discount = Discount::where('code', $code)->first();

        if (! $discount) {
            return response()->json([
                'success' => false,
                'message' => 'Coupon code not found.',
            ], 404);
        }

        if ($discount->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => "Coupon is currently {$discount->status}.",
            ], 422);
        }

        if ($discount->usage_limit !== null && $discount->used_count >= $discount->usage_limit) {
            return response()->json([
                'success' => false,
                'message' => 'Coupon limit reached.',
            ], 422);
        }

        if ($discount->min_order_amount > 0 && $orderAmount < $discount->min_order_amount) {
            return response()->json([
                'success' => false,
                'message' => 'Minimum order amount of ₱'.number_format($discount->min_order_amount, 2).' required.',
            ], 422);
        }

        $discountAmount = 0;
        if ($discount->type === 'percentage') {
            $discountAmount = ($orderAmount * (float) $discount->value) / 100;
        } else {
            $discountAmount = (float) $discount->value;
        }

        if ($discount->max_discount_amount && $discountAmount > $discount->max_discount_amount) {
            $discountAmount = (float) $discount->max_discount_amount;
        }

        $finalTotal = max(0, $orderAmount - $discountAmount);

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $discount->code,
                'name' => $discount->name,
                'type' => $discount->type,
                'value' => (float) $discount->value,
                'discount_amount' => round($discountAmount, 2),
                'final_total' => round($finalTotal, 2),
            ],
        ]);
    }
}
