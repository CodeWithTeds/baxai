# Sales Intelligence & Projection Matrix — Implementation Plan

## Overview

Add a new **Sales** page to the admin dashboard with **Groq AI-powered projections** that identify best-selling products and forecast future sales. The page matches the existing dashboard design language (monospace, sharp corners, `#1A1C1E` on white, pure SVG charts) with **interactive CSS animations** throughout.

---

## Files to Create / Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `backend/app/Http/Controllers/SalesController.php` | **Create** | Sales data + Groq AI projection |
| 2 | `backend/routes/web.php` | **Edit** | Add `GET /sales` route |
| 3 | `backend/resources/js/pages/sales.tsx` | **Create** | Sales page with animations |
| 4 | `backend/resources/js/components/app-sidebar.tsx` | **Edit** | Add Sales nav link |
| 5 | `backend/resources/js/components/placides-sidebar.tsx` | **Edit** | Add Sales nav link |
| 6 | `backend/resources/js/routes/index.ts` | **Edit** | Add `sales` route helper |

---

## 1. SalesController.php (New)

**Namespace:** `App\Http\Controllers`

### `index(Request $request): Response`

Computes all sales analytics and projection data server-side.

#### A. Summary Stats
- `total_revenue` — SUM of non-cancelled order totals
- `monthly_revenue` — revenue for current month
- `avg_order_value` — total_revenue / non-cancelled order count
- `total_orders`, `delivered_orders`, `cancelled_orders`

#### B. Sales Timeline (last 30 days)
Same query pattern as DashboardController:
```sql
DATE(created_at) as date,
COUNT(*) as orders_count,
SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as revenue
GROUP BY date ORDER BY date ASC
```
Includes `cumulative_revenue` running total.

#### C. Best Sellers (top 10 products)
```sql
SELECT product_id, product_name,
    SUM(quantity) as total_qty,
    SUM(total_price) as total_revenue,
    MIN(DATE(o.created_at)) as first_sale_date,
    MAX(DATE(o.created_at)) as last_sale_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY product_id, product_name
ORDER BY total_qty DESC
LIMIT 10
```

#### D. Groq AI Projection (top 5 best sellers)

**Groq API Integration:**

```php
use Illuminate\Support\Facades\Http;

// For each top 5 best seller:
$dailyData = /* last 14 days daily qty from order_items */;

$response = Http::withHeaders([
    'Authorization' => 'Bearer ' . env('GROQ_API'),
    'Content-Type' => 'application/json',
])->timeout(15)->post('https://api.groq.com/openai/v1/chat/completions', [
    'model' => 'llama-3.3-70b-versatile',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'You are a sales forecasting AI. Analyze historical daily sales data and project future sales. Respond with ONLY valid JSON.',
        ],
        [
            'role' => 'user',
            'content' => "Product: {$product->product_name}\nUnit Price: ₱{$product->base_price}\nHistorical daily quantities (last 14 days):\n" . json_encode($dailyData) . "\n\nRespond with JSON only: {\"trend\": \"growing|stable|declining\", \"growth_rate\": 0.00, \"projections\": {\"7_days\": {\"units\": 0, \"confidence\": 0.00}, \"14_days\": {\"units\": 0, \"confidence\": 0.00}, \"30_days\": {\"units\": 0, \"confidence\": 0.00}}, \"reasoning\": \"brief explanation\"}",
        ],
    ],
    'temperature' => 0.2,
    'max_tokens' => 500,
    'response_format' => ['type' => 'json_object'],
]);

$aiResult = json_decode($response->json('choices.0.message.content'), true);
```

**Error Handling / Fallback:**
- API timeout/failure → fallback to simple 7-day moving average
- Invalid JSON response → fallback to moving average
- Rate limiting → cache projections for 1 hour per product (Cache::remember)

**Per-product return structure:**
```php
[
    'product_id' => 1,
    'product_name' => 'Custom Mug',
    'total_qty' => 150,
    'total_revenue' => 22500,
    'velocity' => 5.2,
    'unit_price' => 150,
    'ai_trend' => 'growing',
    'ai_growth_rate' => 0.12,
    'ai_reasoning' => 'Consistent upward trend with weekend peaks',
    'projected_revenue_7d' => 6750,
    'projected_revenue_14d' => 13800,
    'projected_revenue_30d' => 29250,
    'confidence_7d' => 0.87,
    'confidence_14d' => 0.82,
    'confidence_30d' => 0.74,
    'daily_actual' => [['date' => '2026-10-01', 'qty' => 5], ...],
    'daily_projected' => [['date' => '2026-10-15', 'qty' => 8], ...],
]
```

#### E. Category Performance
```sql
SELECT category,
    COUNT(DISTINCT o.id) as orders_count,
    SUM(oi.quantity) as total_qty,
    SUM(oi.total_price) as total_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY category
ORDER BY total_revenue DESC
```

#### F. Top Customers (top 5)
```php
Customer::orderByDesc('total_spent')->take(5)->get()
```

#### Return
```php
return Inertia::render('sales', [
    'summary' => [...],
    'sales_timeline' => [...],
    'best_sellers' => [...],
    'projections' => [...],
    'category_performance' => [...],
    'top_customers' => [...],
]);
```

---

## 2. routes/web.php (Edit)

Add inside `Route::middleware(['auth', 'verified'])->group()` after dashboard:

```php
Route::get('sales', [SalesController::class, 'index'])->name('sales');
```

---

## 3. sales.tsx (New)

**Path:** `backend/resources/js/pages/sales.tsx`

### Design Language
- Monospace font (`font-mono`), sharp corners, `#1A1C1E` on white
- SVG-based charts, pure CSS animations (no animation library)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Header: "Sales Intelligence & Projection Matrix"    │
│ Badge: "AI Projection Active" with pulsing dot      │
├─────────────────────────────────────────────────────┤
│ Stat Grid (6 cards with count-up animation)         │
│ Revenue | Orders | Avg Basket | Best Seller |       │
│ Projected Growth | Avg Confidence                   │
├─────────────────────────────────────────────────────┤
│ Chart 1: Sales Timeline (Area Spline, line draw-in) │
├──────────────────────┬──────────────────────────────┤
│ Chart 2: Best Sellers │ Chart 3: AI Projection Chart │
│ (Bars grow L-to-R)    │ (Actual vs Projected + cone) │
├──────────────────────┴──────────────────────────────┤
│ Chart 4: Category Performance (Bars rise from bottom)│
├─────────────────────────────────────────────────────┤
│ Chart 5: Top Customers (Slide-in rows)              │
└─────────────────────────────────────────────────────┘
```

### TypeScript Interfaces

```typescript
interface SalesSummary {
    total_revenue: number;
    monthly_revenue: number;
    avg_order_value: number;
    total_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
}

interface SalesTimelineItem {
    date: string;
    orders_count: number;
    revenue: number;
    cumulative_revenue: number;
}

interface BestSeller {
    product_id: number;
    product_name: string;
    total_qty: number;
    total_revenue: number;
    velocity: number;
}

interface Projection {
    product_id: number;
    product_name: string;
    total_qty: number;
    total_revenue: number;
    velocity: number;
    unit_price: number;
    ai_trend: string;
    ai_growth_rate: number;
    ai_reasoning: string;
    projected_revenue_7d: number;
    projected_revenue_14d: number;
    projected_revenue_30d: number;
    confidence_7d: number;
    confidence_14d: number;
    confidence_30d: number;
    daily_actual: { date: string; qty: number }[];
    daily_projected: { date: string; qty: number }[];
}

interface CategoryPerformance {
    category: string;
    orders_count: number;
    total_qty: number;
    total_revenue: number;
}

interface TopCustomer {
    id: number;
    name: string;
    customer_code: string;
    total_orders: number;
    total_spent: number;
}
```

### Chart Details & Animations

**Chart 1: Sales Timeline**
- SVG area spline (same as dashboard Chart 1)
- **Line draw-in** — stroke-dasharray animation left-to-right
- **Data nodes pop in** — circles scale from 0 with stagger
- **Area fill fades in** — gradient opacity 0 → 0.25
- **Hover crosshair** — vertical line + tooltip follows mouse
- Toggle: Daily Revenue / Cumulative / Orders

**Chart 2: Best Sellers Ranking**
- Horizontal bars ranked by `total_revenue`
- **Bars grow left-to-right** — width 0% → final with 100ms stagger
- **Rank counter** — numbers count up from 0
- **Hover glow** — bar shifts to accent color with scale transform

**Chart 3: AI Projection Chart**
- Two lines per product: solid (actual) + dashed (projected)
- **Two-phase line draw** — solid draws first, then dashed with glow at junction
- **Projection cone** — shaded confidence interval fans out
- **Animated dots** — small circles travel along path (CSS offset-path)
- **View toggle** — 7/14/30 days with smooth morph (not hard cut)
- **AI reasoning tooltip** — hover shows Groq's reasoning text
- **Trend badge** — growing (green pulse) / stable (amber) / declining (red)

**Chart 4: Category Performance**
- Vertical bar chart
- **Bars rise from bottom** — height 0 → final with stagger
- **Value labels fade in** after bars complete
- **Hover lift** — bar translateY(-2px) with dark overlay

**Chart 5: Top Customers**
- **Slide-in from left** — each row slides with stagger
- **Avatar pulse** — rank #1 has subtle scale pulse
- **Spend counter** — animates from 0 to final

### Animation Implementation

**CSS Keyframes (in sales.tsx `<style>` tag):**
```css
@keyframes lineDraw { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
@keyframes nodePop { from { r: 0; } to { r: 3.5; } }
@keyframes barGrow { from { width: 0; } }
@keyframes barRise { from { height: 0; } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInLeft { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes countUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes dotTravel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
```

**React hooks:**
- `useInView` — IntersectionObserver to trigger animations when chart scrolls into view
- `useCountUp` — animates numbers from 0 to target over 800ms
- `useStagger` — returns delay index for staggered children

---

## 4. app-sidebar.tsx (Edit)

Add `TrendingUp` to imports and add to `overviewNavItems`:

```typescript
import { ..., TrendingUp } from 'lucide-react';

const overviewNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Sales', href: '/sales', icon: TrendingUp },
];
```

---

## 5. placides-sidebar.tsx (Edit)

Add `TrendingUp` to imports and add inside Overview group:

```tsx
<Item label="Sales" href="/sales">
    <TrendingUp size={18} />
</Item>
```

---

## 6. routes/index.ts (Edit)

Add sales route helper (following dashboard pattern):

```typescript
export const sales = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: sales.url(options),
    method: 'get',
});

sales.definition = {
    methods: ["get","head"],
    url: '/sales',
} satisfies RouteDefinition<["get","head"]>;

sales.url = (options?: RouteQueryOptions) => {
    return sales.definition.url + queryParams(options)
};

sales.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: sales.url(options),
    method: 'get',
});

sales.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: sales.url(options),
    method: 'head',
});

const salesForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: sales.url(options),
    method: 'get',
});

salesForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: sales.url(options),
    method: 'get',
});

salesForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: sales.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
});

sales.form = salesForm;
```

---

## Environment

Already configured:
- `GROQ_API=your-groq-api-key-here` (in `.env` line 68)

No additional env vars needed.

---sal

## Verification Checklist

1. **Route:** Visit `/sales` — page loads without errors
2. **Nav links:** Both sidebars show "Sales" with active state
3. **Groq AI:** Projections return valid data (check storage/logs/laravel.log)
4. **Animations:** All charts animate on scroll into view
5. **Fallback:** If Groq API fails, moving average fallback works
6. **Design:** Matches dashboard aesthetic (monospace, sharp corners, same colors)
7. **Console:** No React warnings or errors
