<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\PrintCategory;
use App\Models\PrintItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        // Total revenue (non-cancelled orders)
        $totalRevenue = (float) Order::where('status', '!=', 'cancelled')->sum('total');

        // Revenue this month
        $monthlyRevenue = (float) Order::where('status', '!=', 'cancelled')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('total');

        // Total orders & status breakdown
        $ordersCount = Order::count();
        $inProgressOrders = Order::where('status', 'in_progress')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $deliveredOrders = Order::where('status', 'delivered')->count();
        $cancelledOrders = Order::where('status', 'cancelled')->count();

        // Payment status breakdown
        $paidOrders = Order::where('payment_status', 'paid')->count();
        $pendingPaymentOrders = Order::where('payment_status', 'pending')->count();

        // Customer stats
        $customersCount = Customer::count();
        $activeCustomers = Customer::where('status', 'active')->count();
        $leadCustomers = Customer::where('status', 'lead')->count();
        $vipCustomers = Customer::where('type', 'vip')->count();

        // Product stats
        $productsCount = Product::count();
        $activeProducts = Product::where('status', 'active')->count();
        $customizableProducts = Product::where('is_customizable', true)->count();
        $preview3dProducts = Product::where('has_3d_preview', true)->count();
        $lowStockProductsCount = Product::where('stock_quantity', '<=', 10)->count();

        // Print catalog stats
        $printItemsCount = PrintItem::count();
        $printCategoriesCount = PrintCategory::count();

        // Sync customer totals if needed
        foreach (Customer::all() as $c) {
            $matchingOrders = Order::where(function ($q) use ($c) {
                $q->where('customer_id', $c->id)
                    ->orWhere('customer_email', $c->email)
                    ->orWhere('customer_name', $c->name);
            })->get();

            if ($matchingOrders->count() > 0 && ($c->total_orders === 0 || $c->total_spent == 0)) {
                $c->total_orders = $matchingOrders->count();
                $c->total_spent = $matchingOrders->where('status', '!=', 'cancelled')->sum('total');
                $c->save();
            }
        }

        // 1. Time-series timeline with cumulative volume and moving average
        $rawTimeline = Order::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as orders_count'),
            DB::raw("SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as revenue")
        )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

        $runningCumulative = 0;
        $salesTimeline = [];
        foreach ($rawTimeline as $idx => $row) {
            $rev = (float) $row->revenue;
            $runningCumulative += $rev;
            $salesTimeline[] = [
                'date' => Carbon::parse($row->date)->format('M d'),
                'raw_date' => $row->date,
                'orders_count' => (int) $row->orders_count,
                'revenue' => $rev,
                'cumulative_revenue' => $runningCumulative,
            ];
        }

        // 2. Order status distribution for Donut / Markov State Machine
        $orderStatusDistribution = [
            [
                'status' => 'in_progress',
                'label' => 'In Progress',
                'count' => $inProgressOrders,
                'percentage' => $ordersCount > 0 ? round(($inProgressOrders / $ordersCount) * 100, 1) : 0,
                'color' => '#2563EB', // Blue
            ],
            [
                'status' => 'processing',
                'label' => 'Processing',
                'count' => $processingOrders,
                'percentage' => $ordersCount > 0 ? round(($processingOrders / $ordersCount) * 100, 1) : 0,
                'color' => '#F59E0B', // Amber
            ],
            [
                'status' => 'delivered',
                'label' => 'Delivered',
                'count' => $deliveredOrders,
                'percentage' => $ordersCount > 0 ? round(($deliveredOrders / $ordersCount) * 100, 1) : 0,
                'color' => '#10B981', // Emerald
            ],
            [
                'status' => 'cancelled',
                'label' => 'Cancelled',
                'count' => $cancelledOrders,
                'percentage' => $ordersCount > 0 ? round(($cancelledOrders / $ordersCount) * 100, 1) : 0,
                'color' => '#EF4444', // Rose
            ],
        ];

        // 3. Category Pareto distribution (Bar Chart)
        $categoryDistribution = Product::select('category', DB::raw('count(*) as count'), DB::raw('sum(stock_quantity) as total_stock'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->get()
            ->map(function ($row) {
                return [
                    'category' => ucfirst(str_replace('_', ' ', $row->category ?: 'General')),
                    'product_count' => (int) $row->count,
                    'stock_quantity' => (int) $row->total_stock,
                ];
            });

        // 4. Customer RFM Scatter Plot (Bivariate Coordinates: X = frequency, Y = spend)
        $rfmScatter = Customer::all()->map(function ($c) {
            $spend = (float) $c->total_spent;
            $orders = (int) $c->total_orders;

            $cluster = 'New Prospect';
            $color = '#94A3B8';
            if ($spend >= 1000) {
                $cluster = 'Enterprise VIP';
                $color = '#7C3AED'; // Purple
            } elseif ($orders >= 4) {
                $cluster = 'Loyal Champion';
                $color = '#2563EB'; // Blue
            } elseif ($orders >= 1) {
                $cluster = 'Active Regular';
                $color = '#10B981'; // Green
            }

            return [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->customer_code ?: "CUST-{$c->id}",
                'orders' => $orders,
                'spend' => $spend,
                'cluster' => $cluster,
                'color' => $color,
            ];
        });

        // 5. Order Value Statistical Dispersion (Box Plot / Quartiles)
        $allTotals = Order::pluck('total')->map(fn ($v) => (float) $v)->sort()->values();
        $totalsCount = $allTotals->count();
        $qMin = $allTotals->first() ?? 0;
        $qMax = $allTotals->last() ?? 0;
        $qMean = $totalsCount > 0 ? round($allTotals->avg(), 2) : 0;
        $q1 = $allTotals->get((int) floor($totalsCount * 0.25)) ?? 0;
        $qMedian = $allTotals->get((int) floor($totalsCount * 0.5)) ?? 0;
        $q3 = $allTotals->get((int) floor($totalsCount * 0.75)) ?? 0;
        $iqr = round($q3 - $q1, 2);

        $quartiles = [
            'min' => $qMin,
            'q1' => $q1,
            'median' => $qMedian,
            'q3' => $q3,
            'max' => $qMax,
            'mean' => $qMean,
            'iqr' => $iqr,
            'sample_size' => $totalsCount,
        ];

        // 6. Kiviat Multi-Axis Radar Metrics (0 to 100 scale)
        $nonCancelledOrders = max(1, $ordersCount - $cancelledOrders);
        $fulfillmentRate = round(($deliveredOrders / $nonCancelledOrders) * 100);
        $inventoryHealthRate = round((Product::where('stock_quantity', '>', 10)->count() / max(1, $productsCount)) * 100);
        $customizationDensity = round(($customizableProducts / max(1, $productsCount)) * 100);
        $paymentReliability = round(($paidOrders / max(1, $ordersCount)) * 100);
        $activeCustomerRate = round(($activeCustomers / max(1, $customersCount)) * 100);
        $categoryCoverage = round((PrintCategory::count() / 10) * 100);

        $radarMetrics = [
            ['axis' => 'Fulfillment Speed', 'value' => min(100, max(20, $fulfillmentRate)), 'fullMark' => 100],
            ['axis' => 'Inventory Health', 'value' => min(100, max(20, $inventoryHealthRate)), 'fullMark' => 100],
            ['axis' => 'Customization %', 'value' => min(100, max(20, $customizationDensity)), 'fullMark' => 100],
            ['axis' => 'Payment Rate', 'value' => min(100, max(15, $paymentReliability)), 'fullMark' => 100],
            ['axis' => 'Client Retention', 'value' => min(100, max(20, $activeCustomerRate)), 'fullMark' => 100],
            ['axis' => 'Service Density', 'value' => min(100, max(20, $categoryCoverage)), 'fullMark' => 100],
        ];

        // 7. Customer Acquisition & Retention Funnel
        $firstOrderCount = Customer::where('total_orders', '>=', 1)->count();
        $repeatOrderCount = Customer::where('total_orders', '>=', 2)->count();
        $vipOrderCount = Customer::where('total_spent', '>=', 1000)->count();

        $conversionFunnel = [
            ['stage' => 'Registered Accounts', 'count' => $customersCount, 'percentage' => 100],
            ['stage' => 'Converted (>= 1 Order)', 'count' => $firstOrderCount, 'percentage' => $customersCount > 0 ? round(($firstOrderCount / $customersCount) * 100, 1) : 0],
            ['stage' => 'Repeat Customers (>= 2)', 'count' => $repeatOrderCount, 'percentage' => $customersCount > 0 ? round(($repeatOrderCount / $customersCount) * 100, 1) : 0],
            ['stage' => 'VIP High-Volume Patrons', 'count' => $vipOrderCount, 'percentage' => $customersCount > 0 ? round(($vipOrderCount / $customersCount) * 100, 1) : 0],
        ];

        // 8. Temporal Density Matrix (Heatmap)
        $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        $dayparts = ['Morning', 'Afternoon', 'Evening', 'Night'];
        $heatmapMatrix = [];

        foreach ($days as $d) {
            $heatmapMatrix[$d] = [];
            foreach ($dayparts as $p) {
                $heatmapMatrix[$d][$p] = 0;
            }
        }

        foreach (Order::all() as $o) {
            $d = $o->created_at->format('D');
            $h = (int) $o->created_at->format('H');
            $p = ($h >= 6 && $h < 12) ? 'Morning' : (($h >= 12 && $h < 18) ? 'Afternoon' : (($h >= 18 && $h < 22) ? 'Evening' : 'Night'));
            if (isset($heatmapMatrix[$d][$p])) {
                $heatmapMatrix[$d][$p]++;
            }
        }

        // 9. Recent Orders and Products list
        $recentOrders = Order::with(['items', 'customer'])
            ->latest('created_at')
            ->take(6)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'total' => (float) $order->total,
                    'placed_at' => $order->placed_at ? $order->placed_at->toIso8601String() : $order->created_at->toIso8601String(),
                    'items_count' => $order->items->count(),
                    'first_item_name' => $order->items->first()?->product_name ?? 'Custom Merch',
                ];
            });

        $topCustomers = Customer::orderByDesc('total_spent')
            ->take(5)
            ->get(['id', 'name', 'customer_code', 'email', 'type', 'status', 'total_orders', 'total_spent']);

        $lowStockProducts = Product::orderBy('stock_quantity', 'asc')
            ->take(5)
            ->get(['id', 'name', 'sku', 'category', 'base_price', 'stock_quantity', 'status', 'is_customizable']);

        return Inertia::render('dashboard', [
            'stats' => [
                'revenue' => [
                    'total' => $totalRevenue,
                    'monthly' => $monthlyRevenue,
                    'avg_order_value' => $ordersCount > 0 ? round($totalRevenue / max(1, ($ordersCount - $cancelledOrders)), 2) : 0,
                ],
                'orders' => [
                    'total' => $ordersCount,
                    'in_progress' => $inProgressOrders,
                    'processing' => $processingOrders,
                    'delivered' => $deliveredOrders,
                    'cancelled' => $cancelledOrders,
                    'paid' => $paidOrders,
                    'pending_payment' => $pendingPaymentOrders,
                ],
                'customers' => [
                    'total' => $customersCount,
                    'active' => $activeCustomers,
                    'lead' => $leadCustomers,
                    'vip' => $vipCustomers,
                ],
                'products' => [
                    'total' => $productsCount,
                    'active' => $activeProducts,
                    'customizable' => $customizableProducts,
                    'with_3d' => $preview3dProducts,
                    'low_stock' => $lowStockProductsCount,
                ],
                'printing' => [
                    'items_count' => $printItemsCount,
                    'categories_count' => $printCategoriesCount,
                ],
            ],
            // Charts & Data Viz payloads
            'sales_timeline' => $salesTimeline,
            'order_status_distribution' => $orderStatusDistribution,
            'category_distribution' => $categoryDistribution,
            'rfm_scatter' => $rfmScatter,
            'quartiles' => $quartiles,
            'radar_metrics' => $radarMetrics,
            'conversion_funnel' => $conversionFunnel,
            'heatmap_matrix' => $heatmapMatrix,
            // Context records
            'recent_orders' => $recentOrders,
            'top_customers' => $topCustomers,
            'low_stock_products' => $lowStockProducts,
        ]);
    }
}
