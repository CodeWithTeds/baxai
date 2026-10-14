<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    public function index(Request $request): Response
    {
        // --------------------------------------------------------------------------
        // A. SUMMARY STATS
        // --------------------------------------------------------------------------
        $totalRevenue = (float) Order::where('status', '!=', 'cancelled')->sum('total');

        $monthlyRevenue = (float) Order::where('status', '!=', 'cancelled')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('total');

        $nonCancelledOrdersCount = Order::where('status', '!=', 'cancelled')->count();
        $avgOrderValue = $nonCancelledOrdersCount > 0 ? round($totalRevenue / $nonCancelledOrdersCount, 2) : 0.0;

        $totalOrders = Order::count();
        $deliveredOrders = Order::where('status', 'delivered')->count();
        $cancelledOrders = Order::where('status', 'cancelled')->count();

        // --------------------------------------------------------------------------
        // B. BEST SELLERS (top 10 products)
        // --------------------------------------------------------------------------
        $bestSellersRaw = OrderItem::select(
            'order_items.product_id',
            'order_items.product_name',
            DB::raw('SUM(order_items.quantity) as total_qty'),
            DB::raw('SUM(order_items.total_price) as total_revenue'),
            DB::raw('MIN(DATE(orders.created_at)) as first_sale_date'),
            DB::raw('MAX(DATE(orders.created_at)) as last_sale_date')
        )
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', '!=', 'cancelled')
            ->groupBy('order_items.product_id', 'order_items.product_name')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get();

        $now = Carbon::now();
        $sevenDaysAgo = Carbon::now()->subDays(7);
        $fourteenDaysAgo = Carbon::now()->subDays(14);

        $bestSellers = [];
        foreach ($bestSellersRaw as $row) {
            $totalQty = (int) $row->total_qty;
            $revenue = (float) $row->total_revenue;
            $unitPrice = $totalQty > 0 ? round($revenue / $totalQty, 2) : 0.0;

            $daysSinceFirst = max(1, Carbon::parse($row->first_sale_date)->diffInDays($now));
            $velocity = round($totalQty / $daysSinceFirst, 2);

            $filterItemQuery = function ($q) use ($row) {
                if ($row->product_id) {
                    $q->where('order_items.product_id', $row->product_id);
                } else {
                    $q->where('order_items.product_name', $row->product_name);
                }
            };

            // Trend: last 7 days vs prior 7 days
            $last7Query = OrderItem::join('orders', 'orders.id', '=', 'order_items.order_id')
                ->where('orders.status', '!=', 'cancelled')
                ->where('orders.created_at', '>=', $sevenDaysAgo);
            $filterItemQuery($last7Query);
            $last7Qty = (int) $last7Query->sum('order_items.quantity');

            $prior7Query = OrderItem::join('orders', 'orders.id', '=', 'order_items.order_id')
                ->where('orders.status', '!=', 'cancelled')
                ->whereBetween('orders.created_at', [$fourteenDaysAgo, $sevenDaysAgo]);
            $filterItemQuery($prior7Query);
            $prior7Qty = (int) $prior7Query->sum('order_items.quantity');

            if ($prior7Qty > 0) {
                $trend = round((($last7Qty - $prior7Qty) / $prior7Qty) * 100, 1);
            } else {
                $trend = $last7Qty > 0 ? 100.0 : 0.0;
            }

            $numericId = $row->product_id ? (int) $row->product_id : (abs(crc32($row->product_name ?? 'product')) % 100000 + 1000);

            $bestSellers[] = [
                'product_id' => $numericId,
                'product_name' => $row->product_name ?? 'Product #'.$numericId,
                'total_qty' => $totalQty,
                'total_revenue' => $revenue,
                'velocity' => $velocity,
                'trend' => $trend,
                'unit_price' => $unitPrice,
                '_raw_product_id' => $row->product_id,
            ];
        }

        // --------------------------------------------------------------------------
        // C. AI-POWERED PROJECTION ENGINE (WITH STATISTICAL FALLBACK)
        // --------------------------------------------------------------------------
        $top5 = array_slice($bestSellers, 0, 5);

        // Gather 14-day history for the top 5
        $productHistories = [];
        foreach ($top5 as $item) {
            $rawId = $item['_raw_product_id'];
            $prodName = $item['product_name'];

            $matchProduct = function ($q) use ($rawId, $prodName) {
                if ($rawId) {
                    $q->where('order_items.product_id', $rawId);
                } else {
                    $q->where('order_items.product_name', $prodName);
                }
            };

            $dailyActual = [];
            $quantities = [];
            for ($i = 13; $i >= 0; $i--) {
                $dateObj = Carbon::now()->subDays($i);
                $dateStr = $dateObj->toDateString();

                $dayQuery = OrderItem::join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->where('orders.status', '!=', 'cancelled')
                    ->whereDate('orders.created_at', $dateStr);
                $matchProduct($dayQuery);
                $qty = (int) $dayQuery->sum('order_items.quantity');

                $dailyActual[] = [
                    'date' => $dateObj->format('M d'),
                    'qty' => $qty,
                ];
                $quantities[] = $qty;
            }

            $productHistories[$item['product_id']] = [
                'item' => $item,
                'daily_actual' => $dailyActual,
                'quantities' => $quantities,
            ];
        }

        // Cache handling for AI projections
        $cacheKey = 'sales_ai_projections_matrix_v3';
        if ($request->boolean('refresh_ai')) {
            Cache::forget($cacheKey);
        }

        $aiResult = Cache::remember($cacheKey, 1800, function () use ($productHistories) {
            return $this->callGroqAiForProjections($productHistories);
        });

        // Assemble final projections array
        $projections = [];
        foreach ($productHistories as $prodId => $data) {
            $item = $data['item'];
            $dailyActual = $data['daily_actual'];
            $quantities = $data['quantities'];
            $unitPrice = $item['unit_price'];

            $aiProduct = $aiResult['products'][$prodId] ?? null;

            if ($aiProduct && ! empty($aiProduct['projections'])) {
                // Use AI Projections
                $u7 = max(1, (int) round($aiProduct['projections']['7_days']['units'] ?? 5));
                $u14 = max(1, (int) round($aiProduct['projections']['14_days']['units'] ?? 10));
                $u30 = max(1, (int) round($aiProduct['projections']['30_days']['units'] ?? 20));

                $c7 = min(95, max(45, (int) round($aiProduct['projections']['7_days']['confidence'] ?? 85)));
                $c14 = min(95, max(40, (int) round($aiProduct['projections']['14_days']['confidence'] ?? 80)));
                $c30 = min(95, max(35, (int) round($aiProduct['projections']['30_days']['confidence'] ?? 72)));

                // Build daily projected array for next 14 days
                $dailyProjected = [];
                $aiDailyQty = $aiProduct['daily_projected_qty'] ?? [];
                for ($step = 1; $step <= 14; $step++) {
                    $futureDate = Carbon::now()->addDays($step);
                    $stepQty = isset($aiDailyQty[$step - 1]) ? (float) $aiDailyQty[$step - 1] : round($u14 / 14, 1);
                    $dailyProjected[] = [
                        'date' => $futureDate->format('M d'),
                        'qty' => max(0.2, round($stepQty, 1)),
                    ];
                }

                $projections[] = [
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'total_qty' => $item['total_qty'],
                    'total_revenue' => $item['total_revenue'],
                    'velocity' => $item['velocity'],
                    'trend' => $item['trend'],
                    'unit_price' => $unitPrice,
                    'ai_trend' => $aiProduct['ai_trend'] ?? ($item['trend'] >= 0 ? 'growing' : 'declining'),
                    'ai_growth_rate' => (float) ($aiProduct['ai_growth_rate'] ?? round($item['trend'] / 100, 2)),
                    'ai_reasoning' => $aiProduct['ai_reasoning'] ?? 'Algorithmic regression trajectory based on recent sales velocity.',
                    'market_signal' => $aiProduct['market_signal'] ?? 'Maintain buffer stock based on demand trajectory.',
                    'is_ai_powered' => true,
                    'projections' => [
                        '7_days' => [
                            'units' => $u7,
                            'revenue' => round($u7 * $unitPrice, 2),
                            'confidence' => $c7,
                        ],
                        '14_days' => [
                            'units' => $u14,
                            'revenue' => round($u14 * $unitPrice, 2),
                            'confidence' => $c14,
                        ],
                        '30_days' => [
                            'units' => $u30,
                            'revenue' => round($u30 * $unitPrice, 2),
                            'confidence' => $c30,
                        ],
                    ],
                    'daily_actual' => $dailyActual,
                    'daily_projected' => $dailyProjected,
                ];
            } else {
                // Statistical regression fallback
                $fallback = $this->calculateStatisticalProjection($item, $dailyActual, $quantities);
                $projections[] = $fallback;
            }
        }

        // Clean out temporary internal keys
        $cleanBestSellers = array_map(function ($bs) {
            unset($bs['_raw_product_id']);
            return $bs;
        }, $bestSellers);

        // --------------------------------------------------------------------------
        // D. CATEGORY PERFORMANCE
        // --------------------------------------------------------------------------
        $categoryPerformance = OrderItem::select(
            DB::raw("COALESCE(NULLIF(order_items.category, ''), 'Custom / Other') as category"),
            DB::raw('COUNT(DISTINCT orders.id) as orders_count'),
            DB::raw('SUM(order_items.quantity) as total_qty'),
            DB::raw('SUM(order_items.total_price) as total_revenue')
        )
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', '!=', 'cancelled')
            ->groupBy('category')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function ($row) {
                return [
                    'category' => (string) $row->category,
                    'orders_count' => (int) $row->orders_count,
                    'total_qty' => (int) $row->total_qty,
                    'total_revenue' => (float) $row->total_revenue,
                ];
            });

        // --------------------------------------------------------------------------
        // E. TOP CUSTOMERS (top 5)
        // --------------------------------------------------------------------------
        $topCustomers = Customer::orderByDesc('total_spent')
            ->take(5)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'customer_code' => $c->customer_code ?? 'CUST-'.str_pad((string) $c->id, 4, '0', STR_PAD_LEFT),
                    'total_orders' => (int) $c->total_orders,
                    'total_spent' => (float) $c->total_spent,
                ];
            });

        return Inertia::render('sales', [
            'summary' => [
                'total_revenue' => $totalRevenue,
                'monthly_revenue' => $monthlyRevenue,
                'avg_order_value' => $avgOrderValue,
                'total_orders' => $totalOrders,
                'delivered_orders' => $deliveredOrders,
                'cancelled_orders' => $cancelledOrders,
            ],
            'best_sellers' => $cleanBestSellers,
            'projections' => $projections,
            'category_performance' => $categoryPerformance,
            'top_customers' => $topCustomers,
            'ai_meta' => [
                'is_ai_powered' => $aiResult['success'] ?? false,
                'model' => $aiResult['model'] ?? 'Least-Squares Regression + WMA Fallback',
                'store_macro_analysis' => $aiResult['store_macro_analysis'] ?? 'Sales across active products maintain positive catalog velocity. Projections are computed from historical order patterns.',
                'last_updated' => Carbon::now()->format('M d, Y · h:i A'),
            ],
        ]);
    }

    /**
     * Call Groq AI to generate projections and market insights.
     */
    private function callGroqAiForProjections(array $productHistories): array
    {
        $apiKey = config('services.groq.api_key') ?? env('GROQ_API', '');
        if (empty($apiKey)) {
            return ['success' => false, 'products' => []];
        }

        $payload = [];
        foreach ($productHistories as $prodId => $data) {
            $item = $data['item'];
            $payload[] = [
                'id' => $prodId,
                'name' => $item['product_name'],
                'unit_price' => $item['unit_price'],
                'total_sold_all_time' => $item['total_qty'],
                'velocity_daily' => $item['velocity'],
                'history_14d_quantities' => $data['quantities'],
            ];
        }

        if (empty($payload)) {
            return ['success' => false, 'products' => []];
        }

        $modelsToTry = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

        $systemPrompt = <<<'PROMPT'
You are an expert sales forecasting and inventory intelligence AI for an e-commerce & custom printing enterprise in the Philippines.
Analyze the products and their 14-day daily sales history.
Generate predictive forecasting for the next 7, 14, and 30 days, along with strategic market signals and restocking advice.
Return ONLY a valid JSON object (no markdown, no ```json code wrapper) with this structure:
{
  "store_macro_analysis": "2 sentence executive business forecast for store management",
  "products": [
    {
      "id": 1,
      "ai_trend": "growing|stable|declining",
      "ai_growth_rate": 0.15,
      "projections": {
        "7_days": {"units": 45, "confidence": 88},
        "14_days": {"units": 95, "confidence": 82},
        "30_days": {"units": 210, "confidence": 75}
      },
      "daily_projected_qty": [5, 6, 6, 7, 6, 7, 8, 7, 8, 9, 8, 9, 10, 9],
      "ai_reasoning": "1-2 sentence analytical explanation of forecast trajectory",
      "market_signal": "Actionable stocking and production recommendation"
    }
  ]
}
PROMPT;

        foreach ($modelsToTry as $model) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer '.$apiKey,
                    'Content-Type' => 'application/json',
                ])
                    ->timeout(20)
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model' => $model,
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => "Products for forecasting:\n".json_encode($payload)],
                        ],
                        'temperature' => 0.2,
                        'max_tokens' => 2500,
                    ]);

                if ($response->failed()) {
                    Log::warning('Groq AI sales projection failed for model '.$model, ['status' => $response->status()]);
                    continue;
                }

                $reply = $response->json('choices.0.message.content', '');
                $reply = preg_replace('/<think>[\s\S]*?<\/think>/u', '', $reply);
                $reply = trim(str_replace(['```json', '```'], '', $reply));

                if (preg_match('/\{[\s\S]*\}/', $reply, $m)) {
                    $decoded = json_decode($m[0], true);
                    if (is_array($decoded) && ! empty($decoded['products'])) {
                        $productsById = [];
                        foreach ($decoded['products'] as $p) {
                            $id = $p['id'] ?? null;
                            if ($id !== null) {
                                $productsById[$id] = $p;
                            }
                        }

                        return [
                            'success' => true,
                            'model' => 'Groq '.strtoupper(explode('/', $model)[1] ?? $model),
                            'store_macro_analysis' => $decoded['store_macro_analysis'] ?? 'AI predictive forecast generated successfully.',
                            'products' => $productsById,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::error('Groq AI projection exception: '.$e->getMessage());
            }
        }

        return ['success' => false, 'products' => []];
    }

    /**
     * Statistical regression fallback when AI API is unavailable.
     */
    private function calculateStatisticalProjection(array $item, array $dailyActual, array $quantities): array
    {
        $unitPrice = $item['unit_price'];
        $n = count($quantities);
        $xValues = range(0, $n - 1);
        $sumX = array_sum($xValues);
        $sumY = array_sum($quantities);
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += $xValues[$i] * $quantities[$i];
            $sumX2 += $xValues[$i] * $xValues[$i];
        }

        $denom = ($n * $sumX2 - $sumX * $sumX);
        $slope = $denom != 0 ? ($n * $sumXY - $sumX * $sumY) / $denom : 0.0;
        $intercept = $n > 0 ? ($sumY - $slope * $sumX) / $n : 0.0;

        // Weighted Moving Average
        $recentSum = array_sum(array_slice($quantities, 7, 7));
        $priorSum = array_sum(array_slice($quantities, 0, 7));
        $wma = ($recentSum * 2 + $priorSum * 1) / 21;

        $dailyProjected = [];
        $sum7 = 0;
        $sum14 = 0;

        for ($step = 1; $step <= 14; $step++) {
            $futureDate = Carbon::now()->addDays($step);
            $futureX = 13 + $step;
            $lin = max(0.0, $slope * $futureX + $intercept);
            $unitsDay = max(0.2, ($lin * 0.4) + ($wma * 0.6));

            if ($unitsDay <= 0.3 && $item['velocity'] > 0) {
                $unitsDay = max(0.4, $item['velocity']);
            }

            $roundedUnits = round($unitsDay, 1);
            if ($step <= 7) {
                $sum7 += $roundedUnits;
            }
            $sum14 += $roundedUnits;

            $dailyProjected[] = [
                'date' => $futureDate->format('M d'),
                'qty' => $roundedUnits,
            ];
        }

        $u7 = max(1, (int) round($sum7));
        $u14 = max(1, (int) round($sum14));
        $u30 = max(1, (int) round($sum14 * (30 / 14)));

        return [
            'product_id' => $item['product_id'],
            'product_name' => $item['product_name'],
            'total_qty' => $item['total_qty'],
            'total_revenue' => $item['total_revenue'],
            'velocity' => $item['velocity'],
            'trend' => $item['trend'],
            'unit_price' => $unitPrice,
            'ai_trend' => $item['trend'] >= 0 ? 'growing' : 'declining',
            'ai_growth_rate' => round($item['trend'] / 100, 2),
            'ai_reasoning' => 'Calculated via least-squares linear trend and 14-day weighted moving average.',
            'market_signal' => 'Maintain safe inventory levels aligned with current sales velocity.',
            'is_ai_powered' => false,
            'projections' => [
                '7_days' => ['units' => $u7, 'revenue' => round($u7 * $unitPrice, 2), 'confidence' => 78],
                '14_days' => ['units' => $u14, 'revenue' => round($u14 * $unitPrice, 2), 'confidence' => 72],
                '30_days' => ['units' => $u30, 'revenue' => round($u30 * $unitPrice, 2), 'confidence' => 65],
            ],
            'daily_actual' => $dailyActual,
            'daily_projected' => $dailyProjected,
        ];
    }
}
