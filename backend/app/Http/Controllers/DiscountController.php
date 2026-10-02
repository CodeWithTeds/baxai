<?php

namespace App\Http\Controllers;

use App\Models\Discount;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiscountController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Discount::query();

        // Filters
        $filter = $request->input('filter', []);
        $search = $filter['search'] ?? ($filter['code'] ?? null);
        $status = $filter['status'] ?? null;
        $type = $filter['type'] ?? null;
        $category = $filter['category'] ?? null;
        $sort = $request->input('sort', '-created_at');
        $perPage = (int) $request->input('per_page', 10);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($type && $type !== 'all') {
            $query->where('type', $type);
        }

        if ($category && $category !== 'all') {
            $query->where(function ($q) use ($category) {
                $q->where('applicable_category', $category)
                    ->orWhere('applicable_category', 'All Services')
                    ->orWhereNull('applicable_category');
            });
        }

        // Sort
        if (str_starts_with($sort, '-')) {
            $column = substr($sort, 1);
            $query->orderBy($column, 'desc');
        } else {
            $query->orderBy($sort, 'asc');
        }

        $discounts = $query->paginate($perPage)->withQueryString();

        $stats = [
            'total' => Discount::count(),
            'active' => Discount::where('status', 'active')->count(),
            'expired' => Discount::where('status', 'expired')->count(),
            'total_used' => (int) Discount::sum('used_count'),
        ];

        return Inertia::render('discounts/index', [
            'discounts' => $discounts,
            'filters' => $request->all(),
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:discounts,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string|in:percentage,fixed_amount,free_shipping,bulk_print',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'applicable_category' => 'nullable|string',
            'usage_limit' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|string|in:active,scheduled,expired,disabled',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        Discount::create($validated);

        return redirect()->back()->with('flash', [
            'success' => "Discount coupon {$validated['code']} created successfully.",
        ]);
    }

    public function update(Request $request, Discount $discount)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:discounts,code,'.$discount->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string|in:percentage,fixed_amount,free_shipping,bulk_print',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'applicable_category' => 'nullable|string',
            'usage_limit' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|string|in:active,scheduled,expired,disabled',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $discount->update($validated);

        return redirect()->back()->with('flash', [
            'success' => "Discount coupon {$discount->code} updated successfully.",
        ]);
    }

    public function destroy(Discount $discount)
    {
        $code = $discount->code;
        $discount->delete();

        return redirect()->back()->with('flash', [
            'success' => "Discount coupon {$code} archived successfully.",
        ]);
    }

    public function bulkActivate(Request $request)
    {
        $ids = $request->input('ids', []);
        if (! empty($ids)) {
            Discount::whereIn('id', $ids)->update(['status' => 'active']);
        }

        return redirect()->back()->with('flash', ['success' => count($ids).' coupon(s) activated.']);
    }

    public function bulkArchive(Request $request)
    {
        $ids = $request->input('ids', []);
        if (! empty($ids)) {
            Discount::whereIn('id', $ids)->update(['status' => 'disabled']);
        }

        return redirect()->back()->with('flash', ['success' => count($ids).' coupon(s) disabled.']);
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        if (! empty($ids)) {
            Discount::whereIn('id', $ids)->delete();
        }

        return redirect()->back()->with('flash', ['success' => count($ids).' coupon(s) deleted.']);
    }

    public function calculate(Request $request)
    {
        $code = strtoupper(trim($request->input('code', '')));
        $orderAmount = (float) $request->input('order_amount', 0);
        $category = $request->input('category', 'All Services');

        $discount = Discount::where('code', $code)->first();

        if (! $discount) {
            return response()->json([
                'valid' => false,
                'message' => 'Coupon code not found.',
                'discount_amount' => 0,
                'final_total' => $orderAmount,
            ]);
        }

        if ($discount->status !== 'active') {
            return response()->json([
                'valid' => false,
                'message' => "Coupon is currently {$discount->status}.",
                'discount_amount' => 0,
                'final_total' => $orderAmount,
            ]);
        }

        if ($discount->usage_limit !== null && $discount->used_count >= $discount->usage_limit) {
            return response()->json([
                'valid' => false,
                'message' => 'Coupon usage limit has been reached.',
                'discount_amount' => 0,
                'final_total' => $orderAmount,
            ]);
        }

        if ($discount->min_order_amount > 0 && $orderAmount < $discount->min_order_amount) {
            return response()->json([
                'valid' => false,
                'message' => 'Minimum order amount of ₱'.number_format($discount->min_order_amount, 2).' required.',
                'discount_amount' => 0,
                'final_total' => $orderAmount,
            ]);
        }

        $discountAmount = 0;
        if ($discount->type === 'percentage') {
            $discountAmount = ($orderAmount * (float) $discount->value) / 100;
        } elseif ($discount->type === 'fixed_amount' || $discount->type === 'free_shipping') {
            $discountAmount = (float) $discount->value;
        } elseif ($discount->type === 'bulk_print') {
            $discountAmount = ($orderAmount * (float) $discount->value) / 100;
        }

        if ($discount->max_discount_amount && $discountAmount > $discount->max_discount_amount) {
            $discountAmount = (float) $discount->max_discount_amount;
        }

        if ($discountAmount > $orderAmount) {
            $discountAmount = $orderAmount;
        }

        $finalTotal = max(0, $orderAmount - $discountAmount);

        return response()->json([
            'valid' => true,
            'message' => 'Coupon applied! Saved ₱'.number_format($discountAmount, 2),
            'code' => $discount->code,
            'name' => $discount->name,
            'type' => $discount->type,
            'discount_amount' => round($discountAmount, 2),
            'final_total' => round($finalTotal, 2),
        ]);
    }
}
