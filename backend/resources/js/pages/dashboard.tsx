import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    Box,
    CheckCircle2,
    CircleDot,
    Clock,
    Compass,
    Database,
    DollarSign,
    Eye,
    Filter,
    Layers,
    LineChart,
    MapPin,
    Network,
    Package,
    PieChart,
    Plus,
    Printer,
    RefreshCw,
    Scale,
    ScatterChart,
    ShoppingBag,
    Sparkles,
    Thermometer,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

/* --------------------------------- Types ---------------------------------- */

interface DashboardStats {
    revenue: {
        total: number;
        monthly: number;
        avg_order_value: number;
    };
    orders: {
        total: number;
        in_progress: number;
        processing: number;
        delivered: number;
        cancelled: number;
        paid: number;
        pending_payment: number;
    };
    customers: {
        total: number;
        active: number;
        lead: number;
        vip: number;
    };
    products: {
        total: number;
        active: number;
        customizable: number;
        with_3d: number;
        low_stock: number;
    };
    printing: {
        items_count: number;
        categories_count: number;
    };
}

interface SalesTimelineItem {
    date: string;
    raw_date: string;
    orders_count: number;
    revenue: number;
    cumulative_revenue: number;
}

interface OrderStatusSlice {
    status: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
}

interface CategoryDistItem {
    category: string;
    product_count: number;
    stock_quantity: number;
}

interface RfmCustomerItem {
    id: number;
    name: string;
    code: string;
    orders: number;
    spend: number;
    cluster: string;
    color: string;
}

interface QuartilesData {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
    iqr: number;
    sample_size: number;
}

interface RadarMetricItem {
    axis: string;
    value: number;
    fullMark: number;
}

interface FunnelStageItem {
    stage: string;
    count: number;
    percentage: number;
}

type HeatmapMatrix = Record<string, Record<string, number>>;

interface OrderSummary {
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string;
    status: string;
    payment_status: string;
    total: number;
    placed_at: string;
    items_count: number;
    first_item_name?: string;
}

interface ProductSummary {
    id: number;
    name: string;
    sku: string;
    category?: string | null;
    base_price: string | number;
    stock_quantity: number;
    status: string;
    is_customizable: boolean;
}

interface DashboardProps {
    stats?: DashboardStats;
    sales_timeline?: SalesTimelineItem[];
    order_status_distribution?: OrderStatusSlice[];
    category_distribution?: CategoryDistItem[];
    rfm_scatter?: RfmCustomerItem[];
    quartiles?: QuartilesData;
    radar_metrics?: RadarMetricItem[];
    conversion_funnel?: FunnelStageItem[];
    heatmap_matrix?: HeatmapMatrix;
    recent_orders?: OrderSummary[];
    low_stock_products?: ProductSummary[];
}

export default function Dashboard({
    stats = {
        revenue: { total: 0, monthly: 0, avg_order_value: 0 },
        orders: { total: 0, in_progress: 0, processing: 0, delivered: 0, cancelled: 0, paid: 0, pending_payment: 0 },
        customers: { total: 0, active: 0, lead: 0, vip: 0 },
        products: { total: 0, active: 0, customizable: 0, with_3d: 0, low_stock: 0 },
        printing: { items_count: 0, categories_count: 0 },
    },
    sales_timeline = [],
    order_status_distribution: orderStatusDistribution = [],
    category_distribution = [],
    rfm_scatter = [],
    quartiles = { min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0, iqr: 0, sample_size: 0 },
    radar_metrics = [],
    conversion_funnel = [],
    heatmap_matrix = {},
    recent_orders = [],
    low_stock_products = [],
}: DashboardProps) {
    // Chart filter mode
    const [chartFilter, setChartFilter] = useState<'all' | 'temporal' | 'multivariate' | 'statistical'>('all');
    const [timeMetric, setTimeMetric] = useState<'revenue' | 'cumulative' | 'orders'>('revenue');
    const [hoveredScatter, setHoveredScatter] = useState<RfmCustomerItem | null>(null);
    const [hoveredTimelineIdx, setHoveredTimelineIdx] = useState<number | null>(null);

    // Helpers
    const formatCurrency = (val: number | string | null | undefined) => {
        const num = Number(val) || 0;
        return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    /* -------------------------------------------------------------------------- */
    /* 1. TIME-SERIES MATH & PATH GENERATOR                                        */
    /* -------------------------------------------------------------------------- */
    const timelineData = useMemo(() => {
        if (!sales_timeline || sales_timeline.length === 0) {
            return [{ date: 'Today', raw_date: 'today', orders_count: 1, revenue: 100, cumulative_revenue: 100 }];
        }
        return sales_timeline;
    }, [sales_timeline]);

    const maxTimelineY = useMemo(() => {
        if (timeMetric === 'revenue') {
            return Math.max(...timelineData.map((d) => d.revenue), 1000) * 1.2;
        } else if (timeMetric === 'cumulative') {
            return Math.max(...timelineData.map((d) => d.cumulative_revenue), 1000) * 1.15;
        } else {
            return Math.max(...timelineData.map((d) => d.orders_count), 5) * 1.3;
        }
    }, [timelineData, timeMetric]);

    // Generate SVG path points
    const timelinePoints = useMemo(() => {
        const svgW = 600;
        const svgH = 150;
        const padX = 40;
        const padY = 20;
        const innerW = svgW - padX * 2;
        const innerH = svgH - padY * 2;
        const len = timelineData.length;

        return timelineData.map((item, i) => {
            const x = padX + (len <= 1 ? innerW / 2 : (i / (len - 1)) * innerW);
            const val =
                timeMetric === 'revenue'
                    ? item.revenue
                    : timeMetric === 'cumulative'
                    ? item.cumulative_revenue
                    : item.orders_count;
            const y = padY + innerH - (val / Math.max(1, maxTimelineY)) * innerH;
            return { x, y, item, val };
        });
    }, [timelineData, timeMetric, maxTimelineY]);

    const timelinePathD = useMemo(() => {
        if (timelinePoints.length === 0) return '';
        if (timelinePoints.length === 1) return `M ${timelinePoints[0].x} ${timelinePoints[0].y}`;

        // Build smooth curved spline
        let d = `M ${timelinePoints[0].x} ${timelinePoints[0].y}`;
        for (let i = 0; i < timelinePoints.length - 1; i++) {
            const curr = timelinePoints[i];
            const next = timelinePoints[i + 1];
            const cx = (curr.x + next.x) / 2;
            d += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
        }
        return d;
    }, [timelinePoints]);

    const timelineAreaD = useMemo(() => {
        if (!timelinePathD || timelinePoints.length === 0) return '';
        const last = timelinePoints[timelinePoints.length - 1];
        const first = timelinePoints[0];
        return `${timelinePathD} L ${last.x} 140 L ${first.x} 140 Z`;
    }, [timelinePathD, timelinePoints]);

    /* -------------------------------------------------------------------------- */
    /* 2. DONUT / MARKOV STATE MACHINE CALCULATIONS                                */
    /* -------------------------------------------------------------------------- */
    const donutRadius = 55;
    const donutCircumference = 2 * Math.PI * donutRadius;
    const donutSlices = useMemo(() => {
        let accumulatedPercent = 0;
        return orderStatusDistribution.map((slice) => {
            const strokeDasharray = `${(slice.percentage / 100) * donutCircumference} ${donutCircumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * donutCircumference);
            accumulatedPercent += slice.percentage;
            return { ...slice, strokeDasharray, strokeDashoffset };
        });
    }, [orderStatusDistribution, donutCircumference]);

    /* -------------------------------------------------------------------------- */
    /* 3. RADAR / KIVIAT DIAGRAM CALCULATIONS                                     */
    /* -------------------------------------------------------------------------- */
    const radarCenter = 100;
    const radarMaxR = 70;
    const radarPoints = useMemo(() => {
        const totalAxes = radar_metrics.length || 6;
        return radar_metrics.map((m, i) => {
            const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2;
            const r = (m.value / 100) * radarMaxR;
            const x = radarCenter + r * Math.cos(angle);
            const y = radarCenter + r * Math.sin(angle);
            const labelX = radarCenter + (radarMaxR + 18) * Math.cos(angle);
            const labelY = radarCenter + (radarMaxR + 14) * Math.sin(angle);
            return { ...m, x, y, labelX, labelY, angle };
        });
    }, [radar_metrics]);

    const radarPolygonD = useMemo(() => {
        if (radarPoints.length === 0) return '';
        return radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    }, [radarPoints]);

    /* -------------------------------------------------------------------------- */
    /* 4. SCATTER PLOT MATH (RFM CARTESIAN FIELD)                                  */
    /* -------------------------------------------------------------------------- */
    const maxScatterOrders = useMemo(() => Math.max(...rfm_scatter.map((c) => c.orders), 10), [rfm_scatter]);
    const maxScatterSpend = useMemo(() => Math.max(...rfm_scatter.map((c) => c.spend), 1500), [rfm_scatter]);

    return (
        <>
            <Head title="Computer Science & Data Visualization Matrix - Placides" />

            <div className="flex flex-col gap-5 font-sans text-[#1A1C1E]">
                {/* -------------------- HEADER & CHART DISPATCHER -------------------- */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-3.5">
                    <div className="max-w-[720px]">
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center bg-[#1A1C1E] text-white font-mono text-[11px] font-bold">
                                ∑
                            </span>
                            <h1 className="text-[17px] font-semibold tracking-tight text-[#1A1C1E]">
                                Data Visualization & Statistical Matrix
                            </h1>
                            <Badge variant="outline" className="font-mono text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                                9 Chart Engines Active
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#6B7280]">
                            Multidimensional computational analytics across time-series regressions, Markov state models, bivariate cartesian clustering, Tukey quartile dispersions, and Kiviat polygons.
                        </p>
                    </div>

                    {/* Chart Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-[#F3F4F6] p-1 font-mono text-[11px]">
                        <button
                            type="button"
                            onClick={() => setChartFilter('all')}
                            className={`px-2.5 py-1 transition ${
                                chartFilter === 'all' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280] hover:text-[#1A1C1E]'
                            }`}
                        >
                            All Charts
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartFilter('temporal')}
                            className={`px-2.5 py-1 transition ${
                                chartFilter === 'temporal' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280] hover:text-[#1A1C1E]'
                            }`}
                        >
                            Time-Series
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartFilter('multivariate')}
                            className={`px-2.5 py-1 transition ${
                                chartFilter === 'multivariate' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280] hover:text-[#1A1C1E]'
                            }`}
                        >
                            Multivariate
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartFilter('statistical')}
                            className={`px-2.5 py-1 transition ${
                                chartFilter === 'statistical' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280] hover:text-[#1A1C1E]'
                            }`}
                        >
                            Statistical
                        </button>
                    </div>
                </div>

                {/* -------------------- COMPACT COMPUTATIONAL READOUTS -------------------- */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 font-mono text-xs">
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <span className="text-[10px] text-[#6B7280] uppercase">Gross Revenue (₱)</span>
                        <div className="font-bold text-[#1A1C1E] text-[15px]">{formatCurrency(stats.revenue.total)}</div>
                        <span className="text-[10px] text-emerald-700">∑ Cumulative</span>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <span className="text-[10px] text-[#6B7280] uppercase">Orders Count (N)</span>
                        <div className="font-bold text-[#1A1C1E] text-[15px]">{stats.orders.total}</div>
                        <span className="text-[10px] text-blue-700">{stats.orders.in_progress} in queue</span>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <span className="text-[10px] text-[#6B7280] uppercase">Mean Basket (μ)</span>
                        <div className="font-bold text-[#1A1C1E] text-[15px]">{formatCurrency(quartiles.mean)}</div>
                        <span className="text-[10px] text-[#6B7280]">Median: {formatCurrency(quartiles.median)}</span>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <span className="text-[10px] text-[#6B7280] uppercase">IQR Spread</span>
                        <div className="font-bold text-[#1A1C1E] text-[15px]">₱{quartiles.iqr}</div>
                        <span className="text-[10px] text-[#6B7280]">Q3 - Q1 delta</span>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <span className="text-[10px] text-[#6B7280] uppercase">Customer Nodes</span>
                        <div className="font-bold text-[#1A1C1E] text-[15px]">{stats.customers.total}</div>
                        <span className="text-[10px] text-purple-700">{stats.customers.vip} Tier VIP</span>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <span className="text-[10px] text-[#6B7280] uppercase">Catalog Entities</span>
                        <div className="font-bold text-[#1A1C1E] text-[15px]">{stats.products.total}</div>
                        <span className="text-[10px] text-amber-700">{stats.products.low_stock} Low Stock</span>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* CHART 1: CONTINUOUS TIME-SERIES REGRESSION & AREA SPLINE                  */}
                {/* ========================================================================= */}
                {(chartFilter === 'all' || chartFilter === 'temporal') && (
                    <div className="border border-[#E5E7EB] bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <LineChart size={15} className="text-blue-600" />
                                    <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                        Chart 1: Temporal Revenue Velocity & Regression Spline (Time-Series Analysis)
                                    </h2>
                                </div>
                                <p className="text-[11px] text-[#6B7280]">
                                    Continuous cubic Bézier interpolation curve over discrete chronological transaction epochs.
                                </p>
                            </div>

                            {/* Metric Toggle */}
                            <div className="flex items-center gap-1 bg-[#F3F4F6] p-0.5 font-mono text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setTimeMetric('revenue')}
                                    className={`px-2.5 py-1 transition ${
                                        timeMetric === 'revenue' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280]'
                                    }`}
                                >
                                    Daily Velocity (₱)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTimeMetric('cumulative')}
                                    className={`px-2.5 py-1 transition ${
                                        timeMetric === 'cumulative' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280]'
                                    }`}
                                >
                                    Cumulative Integral (∫)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTimeMetric('orders')}
                                    className={`px-2.5 py-1 transition ${
                                        timeMetric === 'orders' ? 'bg-white font-bold text-[#1A1C1E] shadow-xs' : 'text-[#6B7280]'
                                    }`}
                                >
                                    Order Volume (N)
                                </button>
                            </div>
                        </div>

                        {/* Interactive SVG Canvas */}
                        <div className="relative mt-3 h-48 w-full">
                            <svg className="h-full w-full overflow-visible" viewBox="0 0 600 150" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Cartesian Grid Lines */}
                                <line x1="40" y1="20" x2="560" y2="20" stroke="#F3F4F6" strokeDasharray="3 3" />
                                <line x1="40" y1="60" x2="560" y2="60" stroke="#F3F4F6" strokeDasharray="3 3" />
                                <line x1="40" y1="100" x2="560" y2="100" stroke="#F3F4F6" strokeDasharray="3 3" />
                                <line x1="40" y1="140" x2="560" y2="140" stroke="#E5E7EB" />

                                {/* Spline Area Fill */}
                                <path d={timelineAreaD} fill="url(#areaGradient)" />

                                {/* Main Curve */}
                                <path d={timelinePathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />

                                {/* Data Nodes */}
                                {timelinePoints.map((pt, i) => (
                                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredTimelineIdx(i)} onMouseLeave={() => setHoveredTimelineIdx(null)}>
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={hoveredTimelineIdx === i ? 6 : 3.5}
                                            fill="#FFFFFF"
                                            stroke="#2563EB"
                                            strokeWidth={hoveredTimelineIdx === i ? 3 : 2}
                                            className="transition-all duration-200"
                                        />
                                    </g>
                                ))}
                            </svg>

                            {/* Hover Coordinate Overlay */}
                            {hoveredTimelineIdx !== null && timelinePoints[hoveredTimelineIdx] && (
                                <div
                                    className="absolute -top-1 pointer-events-none -translate-x-1/2 border border-[#1A1C1E] bg-[#1A1C1E] px-2.5 py-1 text-white shadow-md font-mono text-[11px]"
                                    style={{ left: `${(timelinePoints[hoveredTimelineIdx].x / 600) * 100}%` }}
                                >
                                    <div>{timelinePoints[hoveredTimelineIdx].item.date}</div>
                                    <div className="text-emerald-400 font-bold">
                                        ₱{timelinePoints[hoveredTimelineIdx].item.revenue.toLocaleString()} ({timelinePoints[hoveredTimelineIdx].item.orders_count} orders)
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* X-Axis Labels */}
                        <div className="flex justify-between px-8 pt-2 font-mono text-[10px] text-[#6B7280]">
                            {timelinePoints.map((pt, i) => (
                                <span key={i} className={hoveredTimelineIdx === i ? 'font-bold text-[#1A1C1E]' : ''}>
                                    {pt.item.date}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 2-COLUMN CLUSTER: MARKOV FINITE-STATE (DONUT) & KIVIAT MULTI-AXIS RADAR    */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* CHART 2: MARKOV STATE RING / POLAR DONUT */}
                    {(chartFilter === 'all' || chartFilter === 'temporal') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <PieChart size={15} className="text-indigo-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 2: Markov State Allocation (Polar State Machine Donut)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        Finite-state machine distribution across discrete order fulfillment stages.
                                    </p>
                                </div>
                                <span className="font-mono text-[11px] text-[#6B7280]">{stats.orders.total} States</span>
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-6">
                                {/* SVG Polar Donut */}
                                <div className="relative h-44 w-44 shrink-0">
                                    <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
                                        <circle cx="70" cy="70" r={donutRadius} fill="none" stroke="#F3F4F6" strokeWidth="16" />
                                        {donutSlices.map((s, i) => (
                                            <circle
                                                key={i}
                                                cx="70"
                                                cy="70"
                                                r={donutRadius}
                                                fill="none"
                                                stroke={s.color}
                                                strokeWidth="16"
                                                strokeDasharray={s.strokeDasharray}
                                                strokeDashoffset={s.strokeDashoffset}
                                                className="transition-all duration-500 hover:opacity-80"
                                            />
                                        ))}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-center">
                                        <span className="text-xs text-[#6B7280]">Total</span>
                                        <span className="text-xl font-bold text-[#1A1C1E]">{stats.orders.total}</span>
                                        <span className="text-[9px] text-emerald-700 font-semibold">100% Vector</span>
                                    </div>
                                </div>

                                {/* Legend & Transition State Probabilities */}
                                <div className="w-full max-w-[220px] space-y-2 font-mono text-xs">
                                    {orderStatusDistribution.map((item) => (
                                        <div key={item.status} className="flex items-center justify-between border-b border-[#F9FAFB] pb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-[#1A1C1E] text-[11px]">{item.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-[#1A1C1E]">{item.count}</span>
                                                <span className="ml-1 text-[10px] text-[#6B7280]">({item.percentage}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHART 3: KIVIAT / RADAR MULTI-AXIS POLYGON */}
                    {(chartFilter === 'all' || chartFilter === 'multivariate') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Compass size={15} className="text-purple-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 3: Kiviat Multi-Axis Radar (Multivariate Health Vector)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        6-Dimensional polar vector evaluation normalized across 0–100 percentile limits.
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 border border-purple-200">
                                    6 Dimensions
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-center">
                                <div className="relative h-48 w-48">
                                    <svg className="h-full w-full overflow-visible" viewBox="0 0 200 200">
                                        {/* Concentric Reference Polygons (25%, 50%, 75%, 100%) */}
                                        {[0.25, 0.5, 0.75, 1].map((scale, sIdx) => {
                                            const pts = radar_metrics.map((_, i) => {
                                                const angle = (Math.PI * 2 * i) / radar_metrics.length - Math.PI / 2;
                                                const r = radarMaxR * scale;
                                                return `${radarCenter + r * Math.cos(angle)},${radarCenter + r * Math.sin(angle)}`;
                                            }).join(' ');
                                            return <polygon key={sIdx} points={pts} fill="none" stroke="#EEF0F6" strokeWidth="1" />;
                                        })}

                                        {/* Axis Rays */}
                                        {radarPoints.map((p, i) => (
                                            <line
                                                key={i}
                                                x1={radarCenter}
                                                y1={radarCenter}
                                                x2={radarCenter + radarMaxR * Math.cos(p.angle)}
                                                y2={radarCenter + radarMaxR * Math.sin(p.angle)}
                                                stroke="#E5E7EB"
                                                strokeWidth="1"
                                            />
                                        ))}

                                        {/* Shaded Kiviat Vector Polygon */}
                                        <polygon points={radarPoints.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(124, 58, 237, 0.15)" stroke="#7C3AED" strokeWidth="2" />

                                        {/* Polygon Nodes */}
                                        {radarPoints.map((p, i) => (
                                            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#7C3AED" />
                                        ))}

                                        {/* Axis Text Labels */}
                                        {radarPoints.map((p, i) => (
                                            <text
                                                key={i}
                                                x={p.labelX}
                                                y={p.labelY}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="fill-[#4B5563] font-mono text-[8px] font-medium"
                                            >
                                                {p.axis} ({p.value}%)
                                            </text>
                                        ))}
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================================= */}
                {/* 2-COLUMN CLUSTER: CARTESIAN SCATTER (RFM) & PARETO BAR HISTOGRAM          */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* CHART 4: CARTESIAN 2D SCATTER PLOT */}
                    {(chartFilter === 'all' || chartFilter === 'multivariate') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <ScatterChart size={15} className="text-emerald-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 4: Cartesian Bivariate Scatter Field (Customer RFM Clusters)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        X-Axis: Order Frequency (λ) · Y-Axis: Cumulative Monetary Volume (M in ₱).
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] text-[#6B7280]">{rfm_scatter.length} Nodes</span>
                            </div>

                            {/* Scatter Field SVG */}
                            <div className="relative mt-4 h-48 w-full">
                                <svg className="h-full w-full overflow-visible" viewBox="0 0 400 150">
                                    {/* Quadrant Divider Grid */}
                                    <line x1="30" y1="130" x2="390" y2="130" stroke="#E5E7EB" />
                                    <line x1="30" y1="10" x2="30" y2="130" stroke="#E5E7EB" />
                                    <line x1="210" y1="10" x2="210" y2="130" stroke="#F3F4F6" strokeDasharray="3 3" />
                                    <line x1="30" y1="70" x2="390" y2="70" stroke="#F3F4F6" strokeDasharray="3 3" />

                                    {/* Scatter Nodes */}
                                    {rfm_scatter.map((c) => {
                                        const cx = 35 + (c.orders / Math.max(1, maxScatterOrders)) * 340;
                                        const cy = 125 - (c.spend / Math.max(1, maxScatterSpend)) * 110;
                                        const isHovered = hoveredScatter?.id === c.id;

                                        return (
                                            <g
                                                key={c.id}
                                                className="cursor-pointer"
                                                onMouseEnter={() => setHoveredScatter(c)}
                                                onMouseLeave={() => setHoveredScatter(null)}
                                            >
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={isHovered ? 7 : 4.5}
                                                    fill={c.color}
                                                    stroke="#FFFFFF"
                                                    strokeWidth="1.5"
                                                    className="transition-all duration-200"
                                                />
                                            </g>
                                        );
                                    })}
                                </svg>

                                {/* Tooltip readout */}
                                {hoveredScatter && (
                                    <div className="absolute top-2 right-2 border border-[#E5E7EB] bg-white p-2 text-xs font-mono shadow-md">
                                        <div className="font-bold text-[#1A1C1E]">{hoveredScatter.name}</div>
                                        <div className="text-[11px] text-[#6B7280]">
                                            Orders: <span className="text-[#1A1C1E] font-bold">{hoveredScatter.orders}</span> · Spend: <span className="text-emerald-700 font-bold">₱{hoveredScatter.spend.toLocaleString()}</span>
                                        </div>
                                        <span className="text-[9px] uppercase px-1 py-0.2 rounded-none font-bold" style={{ backgroundColor: `${hoveredScatter.color}20`, color: hoveredScatter.color }}>
                                            {hoveredScatter.cluster}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Axis Labels */}
                            <div className="flex justify-between px-6 pt-1 font-mono text-[10px] text-[#6B7280]">
                                <span>Low Frequency (0 Orders)</span>
                                <span className="font-bold text-[#1A1C1E]">Order Frequency Spectrum (λ) →</span>
                                <span>High Frequency ({maxScatterOrders} Orders)</span>
                            </div>
                        </div>
                    )}

                    {/* CHART 5: PARETO FREQUENCY DISTRIBUTION (BAR HISTOGRAM) */}
                    {(chartFilter === 'all' || chartFilter === 'statistical') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <BarChart3 size={15} className="text-amber-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 5: Pareto Frequency Distribution (Category Inventory Mass)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        Ranked discrete mass allocation across merchandise categories.
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 border border-amber-200">
                                    Pareto Ranked
                                </span>
                            </div>

                            <div className="mt-4 space-y-3 font-mono text-xs">
                                {category_distribution.map((cat, idx) => {
                                    const maxStock = Math.max(...category_distribution.map((c) => c.stock_quantity), 100);
                                    const pct = Math.min(100, Math.round((cat.stock_quantity / maxStock) * 100));

                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-[#1A1C1E]">{cat.category}</span>
                                                <span className="text-[#6B7280]">
                                                    <span className="font-bold text-[#1A1C1E]">{cat.stock_quantity}</span> units ({cat.product_count} items)
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-[#F3F4F6] overflow-hidden">
                                                <div
                                                    style={{ width: `${pct}%` }}
                                                    className="h-full bg-[#1A1C1E] transition-all duration-500 hover:bg-[#0052CC]"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================================= */}
                {/* 2-COLUMN CLUSTER: STATISTICAL BOX PLOT & CONVERSION FUNNEL                */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* CHART 6: TUKEY BOX-AND-WHISKER PLOT */}
                    {(chartFilter === 'all' || chartFilter === 'statistical') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Scale size={15} className="text-rose-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 6: Tukey Box-and-Whisker Plot (Order Dispersion & IQR)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        Quartile partition: Min (Q0), 25% (Q1), Median (Q2), 75% (Q3), Max (Q4).
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] text-[#6B7280]">N = {quartiles.sample_size}</span>
                            </div>

                            {/* Box Plot Graphic */}
                            <div className="mt-4 flex flex-col justify-center">
                                <div className="relative h-28 w-full">
                                    <svg className="h-full w-full" viewBox="0 0 500 100">
                                        {/* Scale line */}
                                        <line x1="30" y1="50" x2="470" y2="50" stroke="#CBD5E1" strokeWidth="2" />

                                        {/* Left Whisker (Min to Q1) */}
                                        <line x1="30" y1="50" x2="140" y2="50" stroke="#1E293B" strokeWidth="2" />
                                        <line x1="30" y1="35" x2="30" y2="65" stroke="#1E293B" strokeWidth="2" />

                                        {/* IQR Box (Q1 to Q3) */}
                                        <rect x="140" y="25" width="110" height="50" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2" />

                                        {/* Median Line (Q2) */}
                                        <line x1="165" y1="25" x2="165" y2="75" stroke="#EF4444" strokeWidth="2.5" />

                                        {/* Right Whisker (Q3 to Max) */}
                                        <line x1="250" y1="50" x2="470" y2="50" stroke="#1E293B" strokeWidth="2" />
                                        <line x1="470" y1="35" x2="470" y2="65" stroke="#1E293B" strokeWidth="2" />

                                        {/* Outlier Nodes */}
                                        <circle cx="470" cy="50" r="4" fill="#EF4444" />
                                    </svg>
                                </div>

                                {/* Quartile Metrics Readout Grid */}
                                <div className="grid grid-cols-5 gap-2 border-t border-[#F3F4F6] pt-3 text-center font-mono text-[11px]">
                                    <div>
                                        <span className="text-[#6B7280] text-[10px]">Min (Q0)</span>
                                        <div className="font-bold text-[#1A1C1E]">₱{quartiles.min}</div>
                                    </div>
                                    <div>
                                        <span className="text-[#6B7280] text-[10px]">Q1 (25%)</span>
                                        <div className="font-bold text-[#1A1C1E]">₱{quartiles.q1}</div>
                                    </div>
                                    <div>
                                        <span className="text-rose-600 font-bold text-[10px]">Median (Q2)</span>
                                        <div className="font-bold text-rose-600">₱{quartiles.median}</div>
                                    </div>
                                    <div>
                                        <span className="text-[#6B7280] text-[10px]">Q3 (75%)</span>
                                        <div className="font-bold text-[#1A1C1E]">₱{quartiles.q3}</div>
                                    </div>
                                    <div>
                                        <span className="text-[#6B7280] text-[10px]">Max (Q4)</span>
                                        <div className="font-bold text-[#1A1C1E]">₱{quartiles.max}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHART 7: STAGE-GATE CONVERSION FUNNEL */}
                    {(chartFilter === 'all' || chartFilter === 'statistical') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-teal-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 7: Stage-Gate Pipeline Funnel (Lifecycle Sunk Cost)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        Sequential step-down conversion from initial registry to recurring VIP patrons.
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 border border-teal-200">
                                    Funnel
                                </span>
                            </div>

                            <div className="mt-4 space-y-2.5 font-mono text-xs">
                                {conversion_funnel.map((stage, idx) => {
                                    const widthPercent = Math.max(25, stage.percentage);

                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-[#1A1C1E]">
                                                    {idx + 1}. {stage.stage}
                                                </span>
                                                <span className="text-[#6B7280]">
                                                    <span className="font-bold text-[#1A1C1E]">{stage.count}</span> accounts ({stage.percentage}%)
                                                </span>
                                            </div>
                                            <div className="flex justify-center">
                                                <div
                                                    style={{ width: `${widthPercent}%` }}
                                                    className={`h-5 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500 ${
                                                        idx === 0
                                                            ? 'bg-[#1A1C1E]'
                                                            : idx === 1
                                                            ? 'bg-blue-600'
                                                            : idx === 2
                                                            ? 'bg-indigo-600'
                                                            : 'bg-purple-600'
                                                    }`}
                                                >
                                                    {stage.percentage}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================================= */}
                {/* 2-COLUMN CLUSTER: ACTIVITY HEATMAP TENSOR & PRODUCTION GAUGE              */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* CHART 8: 2D ACTIVITY HEATMAP TENSOR */}
                    {(chartFilter === 'all' || chartFilter === 'temporal') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Activity size={15} className="text-orange-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 8: Temporal Density Matrix (Weekly Daypart Heatmap)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        Order placement intensity mapped across Days of Week × Daypart intervals.
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] text-[#6B7280]">7 × 4 Grid</span>
                            </div>

                            {/* Heatmap Grid */}
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-center font-mono text-[11px]">
                                    <thead>
                                        <tr className="text-[#6B7280]">
                                            <th className="p-1 text-left">Day</th>
                                            <th className="p-1">Morning (06-12)</th>
                                            <th className="p-1">Afternoon (12-18)</th>
                                            <th className="p-1">Evening (18-22)</th>
                                            <th className="p-1">Night (22-06)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F9FAFB]">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                                            const parts = heatmap_matrix[day] || { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
                                            const getColor = (count: number) => {
                                                if (count === 0) return 'bg-[#F9FAFB] text-[#9CA3AF]';
                                                if (count === 1) return 'bg-orange-100 text-orange-800 font-bold';
                                                if (count <= 3) return 'bg-orange-300 text-orange-950 font-bold';
                                                return 'bg-orange-500 text-white font-bold';
                                            };

                                            return (
                                                <tr key={day}>
                                                    <td className="p-1.5 text-left font-semibold text-[#1A1C1E]">{day}</td>
                                                    <td className={`p-1.5 ${getColor(parts.Morning)}`}>{parts.Morning}</td>
                                                    <td className={`p-1.5 ${getColor(parts.Afternoon)}`}>{parts.Afternoon}</td>
                                                    <td className={`p-1.5 ${getColor(parts.Evening)}`}>{parts.Evening}</td>
                                                    <td className={`p-1.5 ${getColor(parts.Night)}`}>{parts.Night}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CHART 9: PRODUCTION THROUGHPUT TACHOMETER (GAUGE) */}
                    {(chartFilter === 'all' || chartFilter === 'multivariate') && (
                        <div className="border border-[#E5E7EB] bg-white p-4">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Thermometer size={15} className="text-cyan-600" />
                                        <h2 className="text-[13px] font-semibold text-[#1A1C1E]">
                                            Chart 9: Print Lab Queue Saturation (Throughput Gauge)
                                        </h2>
                                    </div>
                                    <p className="text-[11px] text-[#6B7280]">
                                        System capacity utilization based on active in-progress print queue.
                                    </p>
                                </div>
                                <span className="font-mono text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 border border-cyan-200">
                                    Load Vector
                                </span>
                            </div>

                            {/* Gauge Arc Graphic */}
                            <div className="mt-4 flex flex-col items-center justify-center">
                                <div className="relative h-32 w-56">
                                    <svg className="h-full w-full" viewBox="0 0 200 120">
                                        {/* Background Track Arc */}
                                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F1F5F9" strokeWidth="16" strokeLinecap="round" />
                                        {/* Load Arc (e.g. 52.6% saturation) */}
                                        <path
                                            d="M 20 100 A 80 80 0 0 1 180 100"
                                            fill="none"
                                            stroke="#0284C7"
                                            strokeWidth="16"
                                            strokeLinecap="round"
                                            strokeDasharray="251.2"
                                            strokeDashoffset={251.2 * (1 - Math.min(1, stats.orders.in_progress / 20))}
                                            className="transition-all duration-700"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 font-mono text-center">
                                        <span className="text-2xl font-bold text-[#1A1C1E]">
                                            {Math.round((stats.orders.in_progress / 20) * 100)}%
                                        </span>
                                        <span className="text-[10px] text-[#6B7280]">
                                            {stats.orders.in_progress} / 20 Queue Capacity
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between w-full max-w-[280px] font-mono text-[11px] border-t border-[#F3F4F6] pt-2 text-[#6B7280]">
                                    <span>Nominal</span>
                                    <span className="font-bold text-[#1A1C1E]">Active State: In Queue</span>
                                    <span>Saturation Limit</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* -------------------- COMPACT ENTITY AUDIT FOOTER -------------------- */}
                <div className="border border-[#E5E7EB] bg-white p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                        <Link href="/orders" className="flex items-center gap-1 font-mono text-blue-700 hover:underline">
                            <ShoppingBag size={13} /> View All {stats.orders.total} Orders
                        </Link>
                        <span className="text-[#D1D5DB]">•</span>
                        <Link href="/customers" className="flex items-center gap-1 font-mono text-purple-700 hover:underline">
                            <Users size={13} /> View All {stats.customers.total} Customers
                        </Link>
                        <span className="text-[#D1D5DB]">•</span>
                        <Link href="/products" className="flex items-center gap-1 font-mono text-amber-700 hover:underline">
                            <Package size={13} /> View All {stats.products.total} Catalog Products
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-[#6B7280]">
                        <Clock size={12} />
                        <span>Computational Data Engine v2.0 · Live Execution</span>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
