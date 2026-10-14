import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    Bot,
    Clock,
    DollarSign,
    Layers,
    Lightbulb,
    Package,
    Percent,
    RefreshCw,
    ShoppingBag,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { sales } from '@/routes';

/* --------------------------------- Types ---------------------------------- */

interface SalesSummary {
    total_revenue: number;
    monthly_revenue: number;
    avg_order_value: number;
    total_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
}

interface BestSeller {
    product_id: number;
    product_name: string;
    total_qty: number;
    total_revenue: number;
    velocity: number;
    trend: number;
    unit_price: number;
}

interface ProjectionWindow {
    units: number;
    revenue: number;
    confidence: number;
}

interface Projection {
    product_id: number;
    product_name: string;
    total_qty: number;
    total_revenue: number;
    velocity: number;
    trend: number;
    unit_price: number;
    ai_trend?: 'growing' | 'stable' | 'declining';
    ai_growth_rate?: number;
    ai_reasoning?: string;
    market_signal?: string;
    is_ai_powered?: boolean;
    projections: {
        '7_days': ProjectionWindow;
        '14_days': ProjectionWindow;
        '30_days': ProjectionWindow;
    };
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

interface AiMeta {
    is_ai_powered: boolean;
    model: string;
    store_macro_analysis: string;
    last_updated: string;
}

interface SalesProps {
    summary?: SalesSummary;
    best_sellers?: BestSeller[];
    projections?: Projection[];
    category_performance?: CategoryPerformance[];
    top_customers?: TopCustomer[];
    ai_meta?: AiMeta;
}

/* -------------------------------- Palette --------------------------------- */

const PRODUCT_COLORS = [
    '#2563EB', // Blue
    '#7C3AED', // Violet
    '#059669', // Emerald
    '#D97706', // Amber
    '#DC2626', // Red
];

export default function Sales({
    summary = {
        total_revenue: 0,
        monthly_revenue: 0,
        avg_order_value: 0,
        total_orders: 0,
        delivered_orders: 0,
        cancelled_orders: 0,
    },
    best_sellers = [],
    projections = [],
    category_performance = [],
    top_customers = [],
    ai_meta = {
        is_ai_powered: false,
        model: 'Least-Squares Regression + WMA',
        store_macro_analysis: 'Analyzing product catalog velocities and multi-week order patterns.',
        last_updated: 'Live',
    },
}: SalesProps) {
    // Projection controls
    const [projectionWindow, setProjectionWindow] = useState<'7_days' | '14_days' | '30_days'>('14_days');
    const [selectedProjectionIndex, setSelectedProjectionIndex] = useState<number>(0);
    const [isRefreshingAi, setIsRefreshingAi] = useState<boolean>(false);
    const [hoveredProjectionPoint, setHoveredProjectionPoint] = useState<{
        date: string;
        qty: number;
        type: 'actual' | 'projected';
    } | null>(null);

    // Helpers
    const formatCurrency = (val: number | string | null | undefined) => {
        const num = Number(val) || 0;
        return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleRefreshAi = () => {
        setIsRefreshingAi(true);
        router.get(
            '/sales',
            { refresh_ai: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsRefreshingAi(false),
            }
        );
    };

    /* -------------------------------------------------------------------------- */
    /* 1. BEST SELLERS HORIZONTAL BAR MATH                                        */
    /* -------------------------------------------------------------------------- */
    const maxSellerRevenue = useMemo(() => {
        if (best_sellers.length === 0) return 1;
        return Math.max(...best_sellers.map((b) => b.total_revenue), 1);
    }, [best_sellers]);

    /* -------------------------------------------------------------------------- */
    /* 2. PROJECTION ENGINE (ACTUAL VS PROJECTED LINES)                           */
    /* -------------------------------------------------------------------------- */
    const activeProjection = useMemo(() => {
        if (projections.length === 0) return null;
        const idx = Math.min(selectedProjectionIndex, projections.length - 1);
        return projections[idx];
    }, [projections, selectedProjectionIndex]);

    const projectionPoints = useMemo(() => {
        if (!activeProjection) return { actual: [], projected: [], maxVal: 10 };

        const actualList = activeProjection.daily_actual || [];
        const projectedList = activeProjection.daily_projected || [];

        const allVals = [...actualList.map((a) => a.qty), ...projectedList.map((p) => p.qty)];
        const maxVal = Math.max(...allVals, 5) * 1.25;

        const svgW = 600;
        const svgH = 180;
        const padX = 40;
        const padY = 24;
        const innerW = svgW - padX * 2;
        const innerH = svgH - padY * 2;

        const totalDays = actualList.length + projectedList.length;

        const actualPoints = actualList.map((item, i) => {
            const x = padX + (i / Math.max(1, totalDays - 1)) * innerW;
            const y = padY + innerH - (item.qty / maxVal) * innerH;
            return { x, y, date: item.date, qty: item.qty };
        });

        const bridgePoint = actualPoints.length > 0 ? actualPoints[actualPoints.length - 1] : null;

        const projectedPoints = projectedList.map((item, i) => {
            const idx = actualList.length + i;
            const x = padX + (idx / Math.max(1, totalDays - 1)) * innerW;
            const y = padY + innerH - (item.qty / maxVal) * innerH;
            return { x, y, date: item.date, qty: item.qty };
        });

        return { actual: actualPoints, projected: projectedPoints, bridgePoint, maxVal };
    }, [activeProjection]);

    const actualPathD = useMemo(() => {
        const pts = projectionPoints.actual;
        if (!pts || pts.length === 0) return '';
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const curr = pts[i];
            const next = pts[i + 1];
            const cx = (curr.x + next.x) / 2;
            d += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
        }
        return d;
    }, [projectionPoints]);

    const projectedPathD = useMemo(() => {
        const pts = projectionPoints.projected;
        const bridge = projectionPoints.bridgePoint;
        if (!pts || pts.length === 0) return '';
        const all = bridge ? [bridge, ...pts] : pts;

        let d = `M ${all[0].x} ${all[0].y}`;
        for (let i = 0; i < all.length - 1; i++) {
            const curr = all[i];
            const next = all[i + 1];
            const cx = (curr.x + next.x) / 2;
            d += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
        }
        return d;
    }, [projectionPoints]);

    /* -------------------------------------------------------------------------- */
    /* 3. CATEGORY HISTOGRAM MATH                                                 */
    /* -------------------------------------------------------------------------- */
    const maxCategoryRevenue = useMemo(() => {
        if (category_performance.length === 0) return 1;
        return Math.max(...category_performance.map((c) => c.total_revenue), 1);
    }, [category_performance]);

    /* -------------------------------------------------------------------------- */
    /* 4. AGGREGATE SUMMARY CALCULATIONS                                          */
    /* -------------------------------------------------------------------------- */
    const avgConfidenceScore = useMemo(() => {
        if (projections.length === 0) return 85;
        const sum = projections.reduce((acc, p) => acc + (p.projections[projectionWindow]?.confidence || 80), 0);
        return Math.round(sum / projections.length);
    }, [projections, projectionWindow]);

    const totalProjectedRevenueWindow = useMemo(() => {
        return projections.reduce((acc, p) => acc + (p.projections[projectionWindow]?.revenue || 0), 0);
    }, [projections, projectionWindow]);

    return (
        <>
            <Head title="Sales Intelligence & AI Projection Matrix" />

            <div className="flex flex-col gap-5 font-sans text-[#1A1C1E]">
                {/* -------------------- HEADER -------------------- */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-3.5">
                    <div className="max-w-[720px]">
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center bg-[#1A1C1E] text-white font-mono text-[11px] font-bold">
                                ∏
                            </span>
                            <h1 className="text-[17px] font-semibold tracking-tight text-[#1A1C1E]">
                                Sales Intelligence & AI Projection Matrix
                            </h1>
                            <Badge variant="outline" className="font-mono text-[10px] text-purple-700 bg-purple-50 border-purple-200 flex items-center gap-1">
                                <Sparkles size={11} />
                                {ai_meta.is_ai_powered ? ai_meta.model : 'Heuristic Model Active'}
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#6B7280]">
                            Neural sales forecasting utilizing Groq Large Language Models, historical multi-week order velocity, seasonality weights, and automated inventory directives.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={isRefreshingAi}
                            onClick={handleRefreshAi}
                            className="inline-flex items-center gap-1.5 border border-[#1A1C1E] bg-[#1A1C1E] px-2.5 py-1 text-xs font-mono font-medium text-white hover:bg-[#333] disabled:opacity-50 transition cursor-pointer"
                        >
                            <RefreshCw size={12} className={isRefreshingAi ? 'animate-spin' : ''} />
                            {isRefreshingAi ? 'Running AI...' : 'Re-run AI Matrix'}
                        </button>
                        <Link
                            href="/orders"
                            className="inline-flex items-center gap-1.5 border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-mono font-medium text-[#1A1C1E] hover:bg-[#F3F4F6]"
                        >
                            <ShoppingBag size={13} />
                            Orders
                        </Link>
                    </div>
                </div>

                {/* -------------------- AI EXECUTIVE MACRO FORECAST BANNER -------------------- */}
                {ai_meta && (
                    <div className="border border-[#1A1C1E] bg-[#1A1C1E] p-3 text-white font-mono text-xs shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-bold uppercase tracking-wider text-emerald-400 text-[11px] flex items-center gap-1">
                                    <Bot size={13} /> AI Executive Macro Forecast
                                </span>
                                <span className="text-[10px] text-white/60">
                                    · Model: {ai_meta.model}
                                </span>
                            </div>
                            <div className="text-[10px] text-white/50">
                                Synced: {ai_meta.last_updated}
                            </div>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-white/90">
                            "{ai_meta.store_macro_analysis}"
                        </p>
                    </div>
                )}

                {/* -------------------- STAT GRID (6 CARDS) -------------------- */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {/* 1. Total Revenue */}
                    <div className="border border-[#E5E7EB] bg-white p-3 font-mono">
                        <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
                            <span>TOTAL REVENUE</span>
                            <DollarSign size={13} className="text-emerald-600" />
                        </div>
                        <p className="mt-1.5 text-base font-bold tracking-tight text-[#1A1C1E]">
                            {formatCurrency(summary.total_revenue)}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">
                            Mo: <span className="text-[#1A1C1E] font-medium">{formatCurrency(summary.monthly_revenue)}</span>
                        </p>
                    </div>

                    {/* 2. Total Orders */}
                    <div className="border border-[#E5E7EB] bg-white p-3 font-mono">
                        <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
                            <span>TOTAL ORDERS</span>
                            <ShoppingBag size={13} className="text-blue-600" />
                        </div>
                        <p className="mt-1.5 text-base font-bold tracking-tight text-[#1A1C1E]">
                            {summary.total_orders.toLocaleString()}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">
                            <span className="text-emerald-700 font-medium">{summary.delivered_orders} dlvd</span> ·{' '}
                            <span className="text-red-600">{summary.cancelled_orders} cld</span>
                        </p>
                    </div>

                    {/* 3. Avg Order Value */}
                    <div className="border border-[#E5E7EB] bg-white p-3 font-mono">
                        <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
                            <span>AVG BASKET</span>
                            <Percent size={13} className="text-purple-600" />
                        </div>
                        <p className="mt-1.5 text-base font-bold tracking-tight text-[#1A1C1E]">
                            {formatCurrency(summary.avg_order_value)}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">Per settled order</p>
                    </div>

                    {/* 4. Top Seller */}
                    <div className="border border-[#E5E7EB] bg-white p-3 font-mono">
                        <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
                            <span>TOP SELLER</span>
                            <Sparkles size={13} className="text-amber-500" />
                        </div>
                        <p className="mt-1.5 text-sm font-bold tracking-tight text-[#1A1C1E] truncate" title={best_sellers[0]?.product_name ?? 'N/A'}>
                            {best_sellers[0]?.product_name ?? 'N/A'}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">
                            {best_sellers[0] ? `${best_sellers[0].total_qty} units sold` : 'No orders yet'}
                        </p>
                    </div>

                    {/* 5. Projected Revenue */}
                    <div className="border border-[#E5E7EB] bg-white p-3 font-mono">
                        <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
                            <span>AI PROJ. REVENUE</span>
                            <TrendingUp size={13} className="text-blue-600" />
                        </div>
                        <p className="mt-1.5 text-base font-bold tracking-tight text-blue-700">
                            {formatCurrency(totalProjectedRevenueWindow)}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">
                            Next {projectionWindow === '7_days' ? '7' : projectionWindow === '14_days' ? '14' : '30'} days forecast
                        </p>
                    </div>

                    {/* 6. Model Confidence */}
                    <div className="border border-[#E5E7EB] bg-white p-3 font-mono">
                        <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
                            <span>AI CONFIDENCE</span>
                            <Target size={13} className="text-emerald-600" />
                        </div>
                        <p className="mt-1.5 text-base font-bold tracking-tight text-emerald-700">
                            {avgConfidenceScore}%
                        </p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">Neural synthesis fit</p>
                    </div>
                </div>

                {/* -------------------- 2-COLUMN: BEST SELLERS & AI PROJECTIONS -------------------- */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* CHART 1: BEST SELLERS (HORIZONTAL BARS) */}
                    <div className="border border-[#E5E7EB] bg-white p-4 font-mono">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={15} className="text-[#1A1C1E]" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1A1C1E]">
                                    1. Best Sellers & Volume Velocity
                                </h2>
                            </div>
                            <span className="text-[10px] text-[#6B7280]">{best_sellers.length} Catalog Leaders</span>
                        </div>

                        <div className="mt-3 flex flex-col gap-2.5">
                            {best_sellers.length === 0 ? (
                                <p className="py-8 text-center text-xs text-[#6B7280]">No product sales recorded yet.</p>
                            ) : (
                                best_sellers.map((item, idx) => {
                                    const percent = Math.min(100, Math.max(8, (item.total_revenue / maxSellerRevenue) * 100));
                                    const isPositiveTrend = item.trend >= 0;

                                    return (
                                        <div key={item.product_id} className="border border-[#F3F4F6] bg-[#FAFAFA] p-2 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-[#1A1C1E] text-[10px] font-bold text-white">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-bold text-[#1A1C1E] truncate" title={item.product_name}>
                                                        {item.product_name}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-[11px] text-[#6B7280]">
                                                        {item.total_qty} units
                                                    </span>
                                                    <span className="font-bold text-[#1A1C1E]">
                                                        {formatCurrency(item.total_revenue)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="h-1.5 flex-1 bg-[#E5E7EB] overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                                    <span className="text-[#6B7280]">{item.velocity} units/day</span>
                                                    <span
                                                        className={`flex items-center font-bold ${
                                                            isPositiveTrend ? 'text-emerald-700' : 'text-red-600'
                                                        }`}
                                                    >
                                                        {isPositiveTrend ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                                        {item.trend > 0 ? `+${item.trend}%` : `${item.trend}%`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CHART 2: AI PROJECTION ENGINE */}
                    <div className="border border-[#E5E7EB] bg-white p-4 font-mono flex flex-col justify-between">
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                                <div className="flex items-center gap-2">
                                    <Bot size={16} className="text-purple-600" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#1A1C1E]">
                                        2. AI Projection Engine (Actual vs Forecast)
                                    </h2>
                                </div>

                                {/* Horizon Toggle */}
                                <div className="flex items-center gap-1 bg-[#F3F4F6] p-0.5 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setProjectionWindow('7_days')}
                                        className={`px-2 py-0.5 transition ${
                                            projectionWindow === '7_days'
                                                ? 'bg-white font-bold text-[#1A1C1E] shadow-xs'
                                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                                        }`}
                                    >
                                        7 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProjectionWindow('14_days')}
                                        className={`px-2 py-0.5 transition ${
                                            projectionWindow === '14_days'
                                                ? 'bg-white font-bold text-[#1A1C1E] shadow-xs'
                                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                                        }`}
                                    >
                                        14 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProjectionWindow('30_days')}
                                        className={`px-2 py-0.5 transition ${
                                            projectionWindow === '30_days'
                                                ? 'bg-white font-bold text-[#1A1C1E] shadow-xs'
                                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                                        }`}
                                    >
                                        30 Days
                                    </button>
                                </div>
                            </div>

                            {/* Product Selector Pills */}
                            {projections.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {projections.map((p, idx) => {
                                        const isSelected = selectedProjectionIndex === idx;
                                        const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];

                                        return (
                                            <button
                                                key={p.product_id}
                                                type="button"
                                                onClick={() => setSelectedProjectionIndex(idx)}
                                                className={`flex items-center gap-1.5 border px-2 py-1 text-[11px] transition cursor-pointer ${
                                                    isSelected
                                                        ? 'border-[#1A1C1E] bg-[#1A1C1E] text-white'
                                                        : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#1A1C1E] hover:text-[#1A1C1E]'
                                                }`}
                                            >
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="truncate max-w-[120px]">{p.product_name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Active Product Projection Summary Banner */}
                            {activeProjection && (
                                <div className="mt-3 flex flex-col gap-2">
                                    <div className="grid grid-cols-3 gap-2 border border-[#DBEAFE] bg-[#EFF6FF] p-2.5 text-xs">
                                        <div>
                                            <div className="text-[10px] uppercase text-[#1E40AF]">Forecast Units</div>
                                            <div className="text-sm font-bold text-[#1E3A8A]">
                                                +{activeProjection.projections[projectionWindow]?.units ?? 0} units
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-[#1E40AF]">Forecast Value</div>
                                            <div className="text-sm font-bold text-[#1E3A8A]">
                                                {formatCurrency(activeProjection.projections[projectionWindow]?.revenue ?? 0)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-[#1E40AF]">Confidence</div>
                                            <div className="text-sm font-bold text-emerald-700">
                                                {activeProjection.projections[projectionWindow]?.confidence ?? 80}% Fit
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Reasoning & Market Directive Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        {/* Reasoning */}
                                        <div className="border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 uppercase">
                                                <Lightbulb size={12} /> AI Analytical Reasoning
                                            </div>
                                            <p className="mt-1 text-[11px] text-[#374151] leading-relaxed">
                                                {activeProjection.ai_reasoning}
                                            </p>
                                        </div>

                                        {/* Market Signal */}
                                        <div className="border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 uppercase">
                                                <Zap size={12} /> Stocking & Market Signal
                                            </div>
                                            <p className="mt-1 text-[11px] text-[#374151] leading-relaxed">
                                                {activeProjection.market_signal}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SVG Dual-Line Plot */}
                            <div className="relative mt-3 h-[180px] w-full">
                                <svg viewBox="0 0 600 180" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                                    <line x1="300" y1="20" x2="300" y2="155" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="1.2" />
                                    <text x="290" y="32" fontSize="9" fill="#6B7280" textAnchor="end">
                                        ← 14D Historical
                                    </text>
                                    <text x="310" y="32" fontSize="9" fill="#2563EB" textAnchor="start" fontWeight="bold">
                                        14D Forecast →
                                    </text>

                                    <line x1="40" y1="24" x2="560" y2="24" stroke="#E5E7EB" strokeDasharray="3 3" />
                                    <line x1="40" y1="85" x2="560" y2="85" stroke="#E5E7EB" strokeDasharray="3 3" />
                                    <line x1="40" y1="150" x2="560" y2="150" stroke="#E5E7EB" />

                                    {/* Actual Solid Line */}
                                    {actualPathD && (
                                        <path
                                            d={actualPathD}
                                            fill="none"
                                            stroke="#1A1C1E"
                                            strokeWidth="2.4"
                                            strokeLinecap="round"
                                        />
                                    )}

                                    {/* Projected Dashed Line */}
                                    {projectedPathD && (
                                        <path
                                            d={projectedPathD}
                                            fill="none"
                                            stroke="#2563EB"
                                            strokeWidth="2.4"
                                            strokeDasharray="5 4"
                                            strokeLinecap="round"
                                        />
                                    )}

                                    {/* Actual dots */}
                                    {projectionPoints.actual.map((pt, i) => (
                                        <circle
                                            key={`act-${i}`}
                                            cx={pt.x}
                                            cy={pt.y}
                                            r="3"
                                            fill="#1A1C1E"
                                            stroke="#FFFFFF"
                                            strokeWidth="1.5"
                                            className="cursor-pointer"
                                            onMouseEnter={() =>
                                                setHoveredProjectionPoint({ date: pt.date, qty: pt.qty, type: 'actual' })
                                            }
                                            onMouseLeave={() => setHoveredProjectionPoint(null)}
                                        />
                                    ))}

                                    {/* Projected dots */}
                                    {projectionPoints.projected.map((pt, i) => (
                                        <circle
                                            key={`proj-${i}`}
                                            cx={pt.x}
                                            cy={pt.y}
                                            r="3.5"
                                            fill="#2563EB"
                                            stroke="#FFFFFF"
                                            strokeWidth="1.5"
                                            className="cursor-pointer"
                                            onMouseEnter={() =>
                                                setHoveredProjectionPoint({ date: pt.date, qty: pt.qty, type: 'projected' })
                                            }
                                            onMouseLeave={() => setHoveredProjectionPoint(null)}
                                        />
                                    ))}
                                </svg>

                                {/* Tooltip */}
                                {hoveredProjectionPoint && (
                                    <div className="pointer-events-none absolute bottom-3 right-3 border border-[#1A1C1E] bg-[#1A1C1E] px-2.5 py-1 text-[10px] text-white shadow font-mono">
                                        <span className="font-bold text-amber-300">
                                            {hoveredProjectionPoint.type === 'actual' ? 'Actual History' : 'AI Projected'}:
                                        </span>{' '}
                                        {hoveredProjectionPoint.date} — {hoveredProjectionPoint.qty} units
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chart 2 Legend */}
                        <div className="mt-2 flex items-center justify-between border-t border-[#E5E7EB] pt-2 text-[10px] text-[#6B7280]">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3.5 bg-[#1A1C1E]" /> Solid = Actual Sales
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3.5 border-t-2 border-dashed border-blue-600" /> Dashed = AI Forecast
                                </span>
                            </div>
                            <span className="text-purple-700 font-medium">
                                Engine: {ai_meta.model}
                            </span>
                        </div>
                    </div>
                </div>

                {/* -------------------- 2-COLUMN: CATEGORIES & TOP CUSTOMERS -------------------- */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* CHART 3: CATEGORY PERFORMANCE (BAR HISTOGRAM) */}
                    <div className="border border-[#E5E7EB] bg-white p-4 font-mono">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                            <div className="flex items-center gap-2">
                                <Layers size={15} className="text-[#1A1C1E]" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1A1C1E]">
                                    3. Category Performance & Revenue Distribution
                                </h2>
                            </div>
                            <span className="text-[10px] text-[#6B7280]">{category_performance.length} Active Categories</span>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            {category_performance.length === 0 ? (
                                <p className="py-8 text-center text-xs text-[#6B7280]">No category data available.</p>
                            ) : (
                                category_performance.map((cat, idx) => {
                                    const percent = Math.min(100, Math.max(8, (cat.total_revenue / maxCategoryRevenue) * 100));

                                    return (
                                        <div key={idx} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#1A1C1E]">{cat.category}</span>
                                                    <span className="text-[10px] text-[#6B7280]">
                                                        ({cat.orders_count} orders · {cat.total_qty} units)
                                                    </span>
                                                </div>
                                                <span className="font-bold text-[#1A1C1E]">{formatCurrency(cat.total_revenue)}</span>
                                            </div>

                                            <div className="h-2 w-full bg-[#F3F4F6] overflow-hidden">
                                                <div
                                                    className="h-full bg-[#1A1C1E] transition-all"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CHART 4: TOP CUSTOMERS (RANKED LIST) */}
                    <div className="border border-[#E5E7EB] bg-white p-4 font-mono">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                            <div className="flex items-center gap-2">
                                <Users size={15} className="text-[#1A1C1E]" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1A1C1E]">
                                    4. Top Customer Patrons by Lifetime Spend
                                </h2>
                            </div>
                            <span className="text-[10px] text-[#6B7280]">Top 5 Patrons</span>
                        </div>

                        <div className="mt-3 flex flex-col gap-2.5">
                            {top_customers.length === 0 ? (
                                <p className="py-8 text-center text-xs text-[#6B7280]">No customer transaction history yet.</p>
                            ) : (
                                top_customers.map((cust, idx) => (
                                    <div
                                        key={cust.id}
                                        className="flex items-center justify-between border border-[#E5E7EB] bg-[#FAFAFA] p-2.5 text-xs hover:border-[#1A1C1E] transition"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#1A1C1E] text-[11px] font-bold text-white">
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <div className="font-bold text-[#1A1C1E]">{cust.name}</div>
                                                <div className="text-[10px] text-[#6B7280]">{cust.customer_code}</div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-bold text-[#1A1C1E]">{formatCurrency(cust.total_spent)}</div>
                                            <div className="text-[10px] text-[#6B7280]">{cust.total_orders} settled orders</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* -------------------- AUDIT FOOTER -------------------- */}
                <div className="border border-[#E5E7EB] bg-white p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-3">
                        <Link href="/orders" className="flex items-center gap-1 text-blue-700 hover:underline">
                            <ShoppingBag size={13} /> View Orders
                        </Link>
                        <span className="text-[#D1D5DB]">•</span>
                        <Link href="/customers" className="flex items-center gap-1 text-purple-700 hover:underline">
                            <Users size={13} /> View Customers
                        </Link>
                        <span className="text-[#D1D5DB]">•</span>
                        <Link href="/products" className="flex items-center gap-1 text-amber-700 hover:underline">
                            <Package size={13} /> View Catalog
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                        <Clock size={12} />
                        <span>Sales Intelligence & AI Neural Forecasting Engine · {ai_meta.model}</span>
                    </div>
                </div>
            </div>
        </>
    );
}

Sales.layout = {
    breadcrumbs: [
        {
            title: 'Sales',
            href: sales(),
        },
    ],
};
