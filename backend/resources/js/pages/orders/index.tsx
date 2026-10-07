import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowUpDown,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Eye,
    PackageCheck,
    Plus,
    RotateCcw,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Truck,
    XCircle,
} from 'lucide-react';
import { dashboard } from '@/routes';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface OrderItemRow {
    id: number;
    product_name: string;
    category?: string | null;
    sku?: string | null;
    banner_image?: string | null;
    viewer_type?: string | null;
    selected_color?: string | null;
    selected_color_name?: string | null;
    selected_size?: string | null;
    customization?: any;
    base_price: number | string;
    addon_price: number | string;
    unit_price: number | string;
    quantity: number;
    total_price: number | string;
}

interface OrderRow {
    id: number;
    order_number: string;
    customer_id?: number | null;
    customer_name: string;
    customer_email: string;
    customer_phone?: string | null;
    status: 'in_progress' | 'processing' | 'delivered' | 'cancelled' | string;
    placed_at: string;
    expected_delivery?: string | null;
    subtotal: number | string;
    customization_total: number | string;
    shipping_fee: number | string;
    discount_total: number | string;
    total: number | string;
    payment_method: string;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | string;
    courier_name?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    tracking_steps?: any[];
    shipping_address?: any;
    notes?: string | null;
    items?: OrderItemRow[];
}

interface Paginated {
    data: OrderRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'processing', label: 'Processing / Printing' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'All Payment Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
];

const SORT_OPTIONS = [
    { value: '-placed_at', label: 'Newest First' },
    { value: 'placed_at', label: 'Oldest First' },
    { value: '-total', label: 'Total (High to Low)' },
    { value: 'total', label: 'Total (Low to High)' },
    { value: 'order_number', label: 'Order # (A-Z)' },
];

export default function OrdersIndex({
    orders = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated,
    filters = {},
    stats = { total: 0, in_progress: 0, processing: 0, delivered: 0, cancelled: 0, total_revenue: 0 },
}: {
    orders?: Paginated;
    filters?: Record<string, any>;
    stats?: { total: number; in_progress: number; processing: number; delivered: number; cancelled: number; total_revenue: number };
}) {
    const safeFilters = filters || {};
    const rawFilter = (safeFilters.filter && typeof safeFilters.filter === 'object' ? safeFilters.filter : {}) as Record<string, string>;

    const [search, setSearch] = useState<string>(rawFilter.search ?? '');
    const [status, setStatus] = useState<string>(rawFilter.status ?? 'all');
    const [paymentStatus, setPaymentStatus] = useState<string>(rawFilter.payment_status ?? 'all');
    const [sort, setSort] = useState<string>(typeof safeFilters.sort === 'string' ? safeFilters.sort : '-placed_at');
    const [perPage, setPerPage] = useState<string>(String(safeFilters.per_page ?? 10));

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [quickViewOrder, setQuickViewOrder] = useState<OrderRow | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const safeData = Array.isArray(orders?.data) ? orders.data : [];

    const handleFilterChange = (updates: Record<string, string>) => {
        const query: Record<string, unknown> = {
            filter: {
                search: updates.search ?? search,
                status: (updates.status ?? status) === 'all' ? undefined : (updates.status ?? status),
                payment_status: (updates.payment_status ?? paymentStatus) === 'all' ? undefined : (updates.payment_status ?? paymentStatus),
            },
            sort: updates.sort ?? sort,
            per_page: updates.per_page ?? perPage,
        };

        Object.keys(query.filter as Record<string, unknown>).forEach((k) => {
            if (!(query.filter as Record<string, unknown>)[k]) {
                delete (query.filter as Record<string, unknown>)[k];
            }
        });

        router.get('/orders', query as never, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setPaymentStatus('all');
        setSort('-placed_at');
        router.get('/orders', {}, { preserveState: true, replace: true });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === safeData.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(safeData.map((i) => i.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const handleBulkStatus = (targetStatus: string) => {
        if (selectedIds.length === 0) return;
        router.post(
            '/orders/bulk-update-status',
            { ids: selectedIds, status: targetStatus },
            { onSuccess: () => setSelectedIds([]) }
        );
    };

    const handleBulkDestroy = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Permanently delete ${selectedIds.length} selected order(s)?`)) return;
        router.post(
            '/orders/bulk-destroy',
            { ids: selectedIds },
            { onSuccess: () => setSelectedIds([]) }
        );
    };

    const handleQuickStatusChange = (orderId: number, newStatus: string) => {
        setStatusUpdating(true);
        router.post(
            `/orders/${orderId}/status`,
            { status: newStatus },
            {
                onSuccess: () => {
                    setStatusUpdating(false);
                    if (quickViewOrder && quickViewOrder.id === orderId) {
                        setQuickViewOrder({ ...quickViewOrder, status: newStatus });
                    }
                },
                onError: () => setStatusUpdating(false),
            }
        );
    };

    const exportCsv = () => {
        const headers = ['Order #', 'Placed At', 'Customer Name', 'Customer Email', 'Customer Phone', 'Status', 'Payment Status', 'Payment Method', 'Subtotal', 'Shipping Fee', 'Discount', 'Total', 'Items Count', 'Courier', 'Tracking #'];
        const rows = safeData.map((o) => [
            `"${o.order_number}"`,
            `"${new Date(o.placed_at).toLocaleString()}"`,
            `"${o.customer_name.replace(/"/g, '""')}"`,
            `"${o.customer_email}"`,
            `"${o.customer_phone || ''}"`,
            o.status,
            o.payment_status,
            `"${o.payment_method}"`,
            o.subtotal,
            o.shipping_fee,
            o.discount_total,
            o.total,
            o.items?.length || 0,
            `"${o.courier_name || ''}"`,
            `"${o.tracking_number || ''}"`,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `orders_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'delivered':
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        <CheckCircle2 size={11} className="text-emerald-600" /> Delivered
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-purple-300 bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-purple-800">
                        <PackageCheck size={11} className="text-purple-600" /> Printing / Processing
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-700">
                        <XCircle size={11} className="text-red-600" /> Cancelled
                    </span>
                );
            case 'in_progress':
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-blue-300 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-800">
                        <Clock size={11} className="text-blue-600" /> In Progress
                    </span>
                );
        }
    };

    const renderPaymentBadge = (pst: string) => {
        switch (pst) {
            case 'paid':
                return <span className="font-mono text-[10px] font-bold uppercase text-emerald-700">Paid</span>;
            case 'failed':
                return <span className="font-mono text-[10px] font-bold uppercase text-red-600">Failed</span>;
            case 'refunded':
                return <span className="font-mono text-[10px] font-bold uppercase text-purple-700">Refunded</span>;
            case 'pending':
            default:
                return <span className="font-mono text-[10px] font-bold uppercase text-amber-700">Pending</span>;
        }
    };

    return (
        <div className="font-sans text-[#1A1C1E]">
            <Head title="Orders Management — Admin" />

            {/* HEADER AREA */}
            <div className="mb-2.5 border-b border-[#E5E7EB] pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-[#1A1C1E]" />
                            <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                                Orders & Fulfillment <span className="font-mono text-xs text-muted-foreground">({stats.total})</span>
                            </h1>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                            Manage merchandise orders, customer print proofs, fulfillment stages, shipping courier tracking, and status updates.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="border border-[#E5E7EB] bg-white px-3 py-1 font-mono text-xs shadow-sm flex items-center gap-2">
                            <span className="text-[#6B7280]">Gross Sales:</span>
                            <strong className="text-[#1A1C1E] font-bold text-sm">₱{stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                </div>

                {/* SUMMARY STATS BAR */}
                <div className="mt-2.5 flex items-center gap-3 border-t border-[#E5E7EB] pt-2 font-mono text-xs overflow-x-auto">
                    <button
                        onClick={() => { setStatus('all'); handleFilterChange({ status: 'all' }); }}
                        className={`pb-0.5 whitespace-nowrap transition-colors ${status === 'all' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        All Orders ({stats.total})
                    </button>
                    <button
                        onClick={() => { setStatus('in_progress'); handleFilterChange({ status: 'in_progress' }); }}
                        className={`pb-0.5 whitespace-nowrap transition-colors flex items-center gap-1 ${status === 'in_progress' ? 'border-b-2 border-blue-600 font-bold text-blue-700' : 'text-[#6B7280] hover:text-blue-700'}`}
                    >
                        <Clock size={12} className="text-blue-600" /> In Progress ({stats.in_progress})
                    </button>
                    <button
                        onClick={() => { setStatus('processing'); handleFilterChange({ status: 'processing' }); }}
                        className={`pb-0.5 whitespace-nowrap transition-colors flex items-center gap-1 ${status === 'processing' ? 'border-b-2 border-purple-600 font-bold text-purple-700' : 'text-[#6B7280] hover:text-purple-700'}`}
                    >
                        <PackageCheck size={12} className="text-purple-600" /> Processing ({stats.processing})
                    </button>
                    <button
                        onClick={() => { setStatus('delivered'); handleFilterChange({ status: 'delivered' }); }}
                        className={`pb-0.5 whitespace-nowrap transition-colors flex items-center gap-1 ${status === 'delivered' ? 'border-b-2 border-emerald-600 font-bold text-emerald-700' : 'text-[#6B7280] hover:text-emerald-700'}`}
                    >
                        <CheckCircle2 size={12} className="text-emerald-600" /> Delivered ({stats.delivered})
                    </button>
                    <button
                        onClick={() => { setStatus('cancelled'); handleFilterChange({ status: 'cancelled' }); }}
                        className={`pb-0.5 whitespace-nowrap transition-colors flex items-center gap-1 ${status === 'cancelled' ? 'border-b-2 border-red-600 font-bold text-red-700' : 'text-[#6B7280] hover:text-red-700'}`}
                    >
                        <XCircle size={12} className="text-red-600" /> Cancelled ({stats.cancelled})
                    </button>
                </div>
            </div>

            {/* FILTER TOOLBAR PANEL */}
            <div className="mb-2.5 rounded-none border border-[#E5E7EB] bg-white p-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        {/* SEARCH INPUT */}
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8A8FA3]" />
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilterChange({ search: e.target.value });
                                }}
                                placeholder="Search Order #, customer name, email, phone..."
                                className="h-7 rounded-none border-[#D1D5DB] pl-8 text-[11px] placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0"
                            />
                        </div>

                        {/* STATUS SELECT */}
                        <Select
                            value={status}
                            onValueChange={(v) => {
                                setStatus(v);
                                handleFilterChange({ status: v });
                            }}
                        >
                            <SelectTrigger className="h-7 w-[150px] rounded-none border-[#D1D5DB] text-[11px] font-mono">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value} className="text-xs">
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* PAYMENT STATUS SELECT */}
                        <Select
                            value={paymentStatus}
                            onValueChange={(v) => {
                                setPaymentStatus(v);
                                handleFilterChange({ payment_status: v });
                            }}
                        >
                            <SelectTrigger className="h-7 w-[160px] rounded-none border-[#D1D5DB] text-[11px] font-mono">
                                <SelectValue placeholder="Payment" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {PAYMENT_STATUS_OPTIONS.map((ps) => (
                                    <SelectItem key={ps.value} value={ps.value} className="text-xs">
                                        {ps.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(search || status !== 'all' || paymentStatus !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={resetFilters}
                                className="h-7 rounded-none px-2 text-[11px] font-mono text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <RotateCcw size={11} className="mr-1" />
                                Reset
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* SORT BY SELECT */}
                        <Select
                            value={sort}
                            onValueChange={(v) => {
                                setSort(v);
                                handleFilterChange({ sort: v });
                            }}
                        >
                            <SelectTrigger className="h-7 w-[160px] rounded-none border-[#D1D5DB] text-[11px] font-mono">
                                <ArrowUpDown size={11} className="mr-1" />
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {SORT_OPTIONS.map((so) => (
                                    <SelectItem key={so.value} value={so.value} className="text-xs">
                                        {so.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* EXPORT CSV */}
                        <Button
                            variant="outline"
                            onClick={exportCsv}
                            title="Export CSV"
                            className="h-7 rounded-none border-[#D1D5DB] px-2 text-[11px] font-mono text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                        >
                            <Download size={12} className="mr-1" />
                            CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* BULK SELECTION ACTION BAR */}
            {selectedIds.length > 0 && (
                <div className="mb-3 flex items-center justify-between rounded-none border border-[#1A1C1E] bg-[#F9FAFB] px-3 py-2 text-xs">
                    <span className="font-mono text-[#1A1C1E]">
                        Selected <strong>{selectedIds.length}</strong> order(s)
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkStatus('delivered')}
                            className="h-7 rounded-none border-[#D1D5DB] text-[11px] font-mono text-emerald-800 bg-white hover:bg-emerald-50"
                        >
                            Mark Delivered
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkStatus('processing')}
                            className="h-7 rounded-none border-[#D1D5DB] text-[11px] font-mono text-purple-800 bg-white hover:bg-purple-50"
                        >
                            Mark Processing
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkStatus('cancelled')}
                            className="h-7 rounded-none border-[#D1D5DB] text-[11px] font-mono text-red-700 bg-white hover:bg-red-50"
                        >
                            Cancel Selected
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleBulkDestroy}
                            className="h-7 rounded-none text-[11px] font-mono"
                        >
                            Delete Selected
                        </Button>
                    </div>
                </div>
            )}

            {/* HIGH-DENSITY PURE BOX TABLE */}
            <div className="overflow-x-auto border border-[#E5E7EB] bg-white">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[10px] uppercase tracking-wider text-[#4A4E5A]">
                            <th className="w-8 px-2 py-2 text-center border-r border-[#E5E7EB]">
                                <Checkbox
                                    checked={safeData.length > 0 && selectedIds.length === safeData.length}
                                    onCheckedChange={toggleSelectAll}
                                    className="rounded-none border-[#D1D5DB]"
                                />
                            </th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Order # & Date</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Customer Details</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Items & Merchandise</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Payment & Method</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Fulfillment Status</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Total Amount</th>
                            <th className="px-2 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                        {safeData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-xs font-mono text-[#8A8FA3]">
                                    No customer orders found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            safeData.map((order) => (
                                <tr key={order.id} className="hover:bg-[#F9FAFB] transition-colors">
                                    <td className="px-2 py-1.5 text-center border-r border-[#E5E7EB]">
                                        <Checkbox
                                            checked={selectedIds.includes(order.id)}
                                            onCheckedChange={() => toggleSelect(order.id)}
                                            className="rounded-none border-[#D1D5DB]"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <Link href={`/orders/${order.id}`} className="font-mono font-bold text-[#1A1C1E] hover:underline">
                                            {order.order_number}
                                        </Link>
                                        <div className="font-mono text-[10px] text-[#6B7280]">
                                            {new Date(order.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div className="font-semibold text-[#1A1C1E]">{order.customer_name}</div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">{order.customer_email}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div className="font-semibold text-[#1A1C1E] line-clamp-1">
                                            {order.items && order.items.length > 0
                                                ? order.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
                                                : 'No items'}
                                        </div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">
                                            {order.items?.length || 0} item(s) ordered
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div>{renderPaymentBadge(order.payment_status)}</div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">{order.payment_method}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center">
                                        {renderStatusBadge(order.status)}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono font-bold text-[#1A1C1E]">
                                        ₱{Number(order.total).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setQuickViewOrder(order)}
                                                title="Quick View / Quick Status"
                                                className="h-7 w-7 rounded-none hover:bg-gray-100 text-[#4A4E5A]"
                                            >
                                                <Eye size={13} />
                                            </Button>
                                            <Link href={`/orders/${order.id}`}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Full Order Details"
                                                    className="h-7 w-7 rounded-none hover:bg-gray-100 text-[#4A4E5A]"
                                                >
                                                    <Truck size={13} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] pt-2.5 font-mono text-xs text-[#6B7280]">
                <div>
                    Showing <strong>{orders.from ?? 0}</strong> to <strong>{orders.to ?? 0}</strong> of <strong>{orders.total ?? 0}</strong> orders
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={orders.current_page <= 1}
                        onClick={() => router.get('/orders', { ...filters, page: orders.current_page - 1 } as never)}
                        className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                    >
                        <ChevronLeft size={13} className="mr-1" /> Prev
                    </Button>
                    <span className="px-2 font-bold text-[#1A1C1E]">
                        Page {orders.current_page} of {orders.last_page}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={orders.current_page >= orders.last_page}
                        onClick={() => router.get('/orders', { ...filters, page: orders.current_page + 1 } as never)}
                        className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                    >
                        Next <ChevronRight size={13} className="ml-1" />
                    </Button>
                </div>
            </div>

            {/* QUICK VIEW MODAL */}
            {quickViewOrder && (
                <Dialog open={!!quickViewOrder} onOpenChange={() => setQuickViewOrder(null)}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="font-mono text-base text-[#1A1C1E] flex items-center justify-between">
                                <span>Order #{quickViewOrder.order_number}</span>
                                <span className="text-xs font-normal text-muted-foreground">
                                    {new Date(quickViewOrder.placed_at).toLocaleString()}
                                </span>
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Quick status update and overview for selected customer order.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 font-sans text-xs">
                            {/* QUICK STATUS CHANGE BOX */}
                            <div className="border border-[#1A1C1E] bg-[#F9FAFB] p-3 font-mono">
                                <p className="mb-1 text-[11px] font-bold uppercase text-[#1A1C1E]">Fulfillment Status</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {['in_progress', 'processing', 'delivered', 'cancelled'].map((st) => (
                                        <Button
                                            key={st}
                                            type="button"
                                            size="sm"
                                            disabled={statusUpdating || quickViewOrder.status === st}
                                            onClick={() => handleQuickStatusChange(quickViewOrder.id, st)}
                                            className={`h-7 rounded-none text-xs font-mono uppercase ${
                                                quickViewOrder.status === st
                                                    ? 'bg-[#1A1C1E] text-white font-bold'
                                                    : 'border border-[#D1D5DB] bg-white text-[#1A1C1E] hover:bg-gray-100'
                                            }`}
                                        >
                                            {st.replace('_', ' ')}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* CUSTOMER & SHIPPING ADDRESS */}
                            <div className="grid grid-cols-2 gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-[11px]">
                                <div>
                                    <p className="text-[#6B7280]">Customer Name:</p>
                                    <p className="font-bold text-[#1A1C1E]">{quickViewOrder.customer_name}</p>
                                    <p className="text-[10px] text-[#6B7280]">{quickViewOrder.customer_email}</p>
                                    <p className="text-[10px] text-[#6B7280]">{quickViewOrder.customer_phone}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280]">Shipping Address:</p>
                                    <p className="text-[11px] text-[#1A1C1E] leading-snug">
                                        {quickViewOrder.shipping_address?.formatted_address ||
                                            quickViewOrder.shipping_address?.street_address ||
                                            'Standard Customer Address'}
                                    </p>
                                </div>
                            </div>

                            {/* ORDERED ITEMS LIST */}
                            <div>
                                <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#4A4E5A] mb-1.5">Line Items ({quickViewOrder.items?.length || 0})</h4>
                                <div className="space-y-1.5 border border-[#E5E7EB] p-2 bg-[#F9FAFB]">
                                    {quickViewOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between border-b border-[#E5E7EB] last:border-b-0 pb-1.5 last:pb-0 text-xs">
                                            <div>
                                                <p className="font-semibold text-[#1A1C1E]">{item.quantity}x {item.product_name}</p>
                                                {item.selected_color_name && <p className="font-mono text-[10px] text-[#6B7280]">Color: {item.selected_color_name}</p>}
                                                {item.customization?.custom_text && <p className="font-mono text-[10px] text-emerald-800">Text: "{item.customization.custom_text}"</p>}
                                            </div>
                                            <div className="font-mono font-bold text-[#1A1C1E]">
                                                ₱{Number(item.total_price).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* TOTAL BREAKDOWN */}
                            <div className="border-t border-[#E5E7EB] pt-2 font-mono text-xs flex justify-between items-center font-bold">
                                <span>Grand Total:</span>
                                <span className="text-base text-[#1A1C1E]">₱{Number(quickViewOrder.total).toFixed(2)}</span>
                            </div>
                        </div>

                        <DialogFooter className="mt-2 border-t border-[#E5E7EB] pt-2">
                            <Link href={`/orders/${quickViewOrder.id}`}>
                                <Button className="h-8 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                    Full Order Page & Courier Details
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={() => setQuickViewOrder(null)}
                                className="h-8 rounded-none border-[#D1D5DB] text-xs bg-white hover:bg-gray-100"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Orders', href: '/orders' },
    ],
};
