import { Head, Link, router, usePage } from '@inertiajs/react';
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
    Calculator,
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Eye,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Tag,
    Trash2,
} from 'lucide-react';
import { dashboard } from '@/routes';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';


interface DiscountRow {
    id: number;
    code: string;
    name: string;
    description: string | null;
    type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bulk_print';
    value: string;
    min_order_amount: string;
    max_discount_amount: string | null;
    applicable_category: string | null;
    usage_limit: number | null;
    used_count: number;
    start_date: string | null;
    end_date: string | null;
    status: 'active' | 'scheduled' | 'expired' | 'disabled';
    created_at: string;
}

interface Paginated {
    data: DiscountRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'expired', label: 'Expired' },
    { value: 'disabled', label: 'Disabled' },
];

const TYPE_OPTIONS = [
    { value: 'all', label: 'All Discount Types' },
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed_amount', label: 'Fixed Amount (₱)' },
    { value: 'free_shipping', label: 'Free Shipping' },
    { value: 'bulk_print', label: 'Bulk Order Special' },
];

const CATEGORY_OPTIONS = [
    { value: 'all', label: 'All Categories' },
    { value: 'All Services', label: 'All Services' },
    { value: 'Apparel & Uniforms', label: 'Apparel & Uniforms' },
    { value: 'Mugs & Drinkware', label: 'Mugs & Drinkware' },
    { value: 'Corporate Gifts', label: 'Corporate Gifts' },
    { value: 'Print Media', label: 'Print Media' },
    { value: 'Packaging', label: 'Packaging' },
];

const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'code', label: 'Code (A-Z)' },
    { value: '-value', label: 'Value (High to Low)' },
    { value: '-used_count', label: 'Most Used' },
];

export default function DiscountsIndex({
    discounts = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated,
    filters = {},
    stats = { total: 0, active: 0, expired: 0, total_used: 0 },
}: {
    discounts?: Paginated;
    filters?: Record<string, any>;
    stats?: { total: number; active: number; expired: number; total_used: number };
}) {
    const pageProps = usePage().props as unknown as {
        flash?: { success?: string; error?: string };
    };
    const flash = pageProps.flash ?? {};
    const rows = Array.isArray(discounts?.data) ? discounts.data : [];

    const safeFilters = filters || {};
    const rawFilter = (safeFilters.filter && typeof safeFilters.filter === 'object' ? safeFilters.filter : {}) as Record<string, string>;

    const [search, setSearch] = useState<string>(rawFilter.search ?? rawFilter.code ?? '');
    const [status, setStatus] = useState<string>(rawFilter.status ?? 'all');
    const [type, setType] = useState<string>(rawFilter.type ?? 'all');
    const [category, setCategory] = useState<string>(rawFilter.category ?? 'all');
    const [sort, setSort] = useState<string>(typeof safeFilters.sort === 'string' ? safeFilters.sort : '-created_at');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [viewId, setViewId] = useState<number | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<DiscountRow | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Coupon Calculator Tester State
    const [calcCode, setCalcCode] = useState('PRINT10');
    const [calcAmount, setCalcAmount] = useState('1500');
    const [calcCategory, setCalcCategory] = useState('All Services');
    const [calcResult, setCalcResult] = useState<any>(null);
    const [calcLoading, setCalcLoading] = useState(false);

    // Form State
    const [formCode, setFormCode] = useState('');
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formType, setFormType] = useState<'percentage' | 'fixed_amount' | 'free_shipping' | 'bulk_print'>('percentage');
    const [formValue, setFormValue] = useState('10');
    const [formMinSpend, setFormMinSpend] = useState('500');
    const [formMaxDiscount, setFormMaxDiscount] = useState('1000');
    const [formCategory, setFormCategory] = useState('All Services');
    const [formLimit, setFormLimit] = useState('100');
    const [formStatus, setFormStatus] = useState<'active' | 'scheduled' | 'expired' | 'disabled'>('active');

    const viewing = rows.find((d) => d.id === viewId) ?? null;

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === rows.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(rows.map((r) => r.id));
        }
    };

    const toggleSelectRow = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const applyFilters = () => {
        const filter: Record<string, string> = {};
        if (search.trim()) filter.search = search.trim();
        if (status !== 'all') filter.status = status;
        if (type !== 'all') filter.type = type;
        if (category !== 'all') filter.category = category;

        router.get(
            '/discounts',
            { filter, sort, per_page: discounts?.per_page ?? 10 },
            { preserveState: true }
        );
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setType('all');
        setCategory('all');
        setSort('-created_at');
        router.get('/discounts', {}, { preserveState: true });
    };

    const openCreateModal = () => {
        setEditingDiscount(null);
        setFormCode('');
        setFormName('');
        setFormDescription('');
        setFormType('percentage');
        setFormValue('10');
        setFormMinSpend('500');
        setFormMaxDiscount('');
        setFormCategory('All Services');
        setFormLimit('100');
        setFormStatus('active');
        setEditModalOpen(true);
    };

    const openEditModal = (d: DiscountRow) => {
        setEditingDiscount(d);
        setFormCode(d.code);
        setFormName(d.name);
        setFormDescription(d.description || '');
        setFormType(d.type);
        setFormValue(d.value);
        setFormMinSpend(d.min_order_amount || '0');
        setFormMaxDiscount(d.max_discount_amount || '');
        setFormCategory(d.applicable_category || 'All Services');
        setFormLimit(d.usage_limit ? String(d.usage_limit) : '');
        setFormStatus(d.status);
        setEditModalOpen(true);
    };

    const handleSaveDiscount = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            code: formCode,
            name: formName,
            description: formDescription,
            type: formType,
            value: formValue,
            min_order_amount: formMinSpend || 0,
            max_discount_amount: formMaxDiscount || null,
            applicable_category: formCategory,
            usage_limit: formLimit ? parseInt(formLimit) : null,
            status: formStatus,
        };

        if (editingDiscount) {
            router.put(`/discounts/${editingDiscount.id}`, payload, {
                onSuccess: () => setEditModalOpen(false),
            });
        } else {
            router.post('/discounts', payload, {
                onSuccess: () => setEditModalOpen(false),
            });
        }
    };

    const handleDeleteSingle = (d: DiscountRow) => {
        if (!confirm(`Archive coupon code ${d.code}?`)) return;
        router.delete(`/discounts/${d.id}`);
    };

    const handleBulkActivate = () => {
        if (selectedIds.length === 0) return;
        setBulkProcessing(true);
        router.post('/discounts/bulk-activate', { ids: selectedIds }, {
            onFinish: () => {
                setBulkProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const handleBulkArchive = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Disable ${selectedIds.length} selected coupon(s)?`)) return;
        setBulkProcessing(true);
        router.post('/discounts/bulk-archive', { ids: selectedIds }, {
            onFinish: () => {
                setBulkProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const handleBulkDestroy = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Permanently delete ${selectedIds.length} selected coupon(s)?`)) return;
        setBulkProcessing(true);
        router.post('/discounts/bulk-destroy', { ids: selectedIds }, {
            onFinish: () => {
                setBulkProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const testCouponCalculator = async () => {
        setCalcLoading(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/discounts/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    code: calcCode,
                    order_amount: calcAmount,
                    category: calcCategory,
                }),
            });
            const data = await res.json();
            setCalcResult(data);
        } catch (err) {
            setCalcResult({ valid: false, message: 'Calculation error occurred.' });
        } finally {
            setCalcLoading(false);
        }
    };

    const exportCsv = () => {
        const targetData = selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
        if (!targetData || targetData.length === 0) {
            alert('No coupon records available to export.');
            return;
        }

        const headers = ['ID', 'Code', 'Name', 'Type', 'Value', 'Min Spend', 'Max Discount', 'Category', 'Limit', 'Used Count', 'Status', 'Created At'];
        const csvRows = [headers.join(',')];

        targetData.forEach((item) => {
            const row = [
                item.id,
                `"${item.code}"`,
                `"${(item.name || '').replace(/"/g, '""')}"`,
                `"${item.type}"`,
                item.value,
                item.min_order_amount,
                item.max_discount_amount || 'N/A',
                `"${item.applicable_category || 'All Services'}"`,
                item.usage_limit || 'Unlimited',
                item.used_count,
                `"${item.status}"`,
                `"${item.created_at || ''}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `discounts_coupons_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatValue = (d: DiscountRow) => {
        if (d.type === 'percentage') return `${parseFloat(d.value)}% OFF`;
        if (d.type === 'fixed_amount') return `₱${parseFloat(d.value).toLocaleString('en-US', { minimumFractionDigits: 2 })} OFF`;
        if (d.type === 'free_shipping') return 'FREE DELIVERY';
        if (d.type === 'bulk_print') return `${parseFloat(d.value)}% BULK DEAL`;
        return d.value;
    };

    const statusBadge = (s: string) => {
        switch (s) {
            case 'active':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ACTIVE</span>;
            case 'scheduled':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> SCHEDULED</span>;
            case 'expired':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> EXPIRED</span>;
            default:
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 border border-gray-300"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> DISABLED</span>;
        }
    };

    return (
        <>
            <Head title="Discounts & Coupons" />
            <div className="flex flex-col gap-3 font-sans text-[#1A1C1E]">

                {/* HEADER SECTION */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
                    <div className="max-w-[640px]">
                        <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                            Discounts & Coupons <span className="font-mono text-xs font-normal text-muted-foreground">({(discounts?.total ?? 0).toLocaleString()})</span>
                        </h1>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Manage promotional discount codes, validity periods, minimum spend thresholds, and category deal rules for printing services.
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={exportCsv}
                            size="sm"
                            className="h-7 rounded-none border-[#D1D5DB] px-2.5 text-[11px] font-normal text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                        >
                            <Download size={12} className="mr-1" /> Export CSV
                        </Button>
                        <Button
                            size="sm"
                            onClick={openCreateModal}
                            className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white hover:bg-black"
                        >
                            <Plus size={12} className="mr-1" /> Create Coupon
                        </Button>
                    </div>
                </div>

                {/* STATS OVERVIEW CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-[#6B7280] uppercase">Total Promo Offers</p>
                        <p className="mt-0.5 text-base font-bold text-[#1A1C1E]">{stats.total}</p>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-emerald-700 uppercase">Active Coupons</p>
                        <p className="mt-0.5 text-base font-bold text-emerald-700">{stats.active}</p>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-amber-700 uppercase">Expired / Inactive</p>
                        <p className="mt-0.5 text-base font-bold text-amber-700">{stats.expired}</p>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-[#0052CC] uppercase">Total Times Claimed</p>
                        <p className="mt-0.5 text-base font-bold text-[#0052CC]">{stats.total_used}</p>
                    </div>
                </div>

                {/* COUPON TESTER & CALCULATOR CARD */}
                <div className="rounded-none border border-[#0052CC]/20 bg-[#F4F8FF] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0052CC]">
                            <Calculator size={14} /> Coupon Applicability & Live Price Calculator
                        </div>
                        <span className="text-[10px] font-mono text-[#6B7280]">Simulate discount application on printing orders</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={calcCode}
                            onChange={(e) => setCalcCode(e.target.value)}
                            placeholder="Enter Code (e.g. PRINT10)"
                            className="h-7 w-36 uppercase rounded-none border-[#D1D5DB] bg-white text-[11px] font-mono"
                        />
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[#4A4E5A]">
                            <span>₱</span>
                            <Input
                                type="number"
                                value={calcAmount}
                                onChange={(e) => setCalcAmount(e.target.value)}
                                placeholder="Subtotal"
                                className="h-7 w-28 rounded-none border-[#D1D5DB] bg-white text-[11px] font-mono"
                            />
                        </div>
                        <Select value={calcCategory} onValueChange={setCalcCategory}>
                            <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] bg-white text-[11px] font-mono">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {CATEGORY_OPTIONS.map((c) => (
                                    <SelectItem key={c.value} value={c.value} className="text-[11px]">
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={testCouponCalculator}
                            disabled={calcLoading}
                            size="sm"
                            className="h-7 rounded-none bg-[#0052CC] px-3 text-[11px] font-normal text-white hover:bg-[#003D99]"
                        >
                            {calcLoading ? 'Calculating...' : 'Test Coupon'}
                        </Button>
                    </div>

                    {calcResult && (
                        <div className={`mt-2 p-2 border font-mono text-[11px] flex flex-wrap items-center justify-between ${calcResult.valid ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'}`}>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{calcResult.message}</span>
                            </div>
                            {calcResult.valid && (
                                <div className="flex items-center gap-4 text-xs font-bold">
                                    <span>Discount: -₱{calcResult.discount_amount.toFixed(2)}</span>
                                    <span className="text-[#0052CC]">Final Total: ₱{calcResult.final_total.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* HEAVY DETAILED FILTER TOOLBAR */}
                <div className="rounded-none border border-[#E5E7EB] bg-white p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div className="relative min-w-[200px] flex-1">
                            <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                                placeholder="Search promo code, offer title, description..."
                                className="h-7 w-full rounded-none border-[#D1D5DB] pl-7 text-[11px] font-normal placeholder:text-[#8A8FA3]"
                            />
                        </div>

                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-7 w-32 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Discount Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {TYPE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Applicable Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {CATEGORY_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger className="h-7 w-36 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <span className="flex items-center gap-1 truncate">
                                    <ArrowUpDown size={11} className="text-muted-foreground" />
                                    <SelectValue placeholder="Sort" />
                                </span>
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {SORT_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button onClick={applyFilters} size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-3 text-[11px] font-normal text-white hover:bg-black">
                            Filter
                        </Button>

                        {(search || status !== 'all' || type !== 'all' || category !== 'all' || sort !== '-created_at') && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={resetFilters}
                                className="h-7 rounded-none px-1.5 text-[11px] font-normal text-red-600 hover:bg-red-50"
                            >
                                <RotateCcw size={11} className="mr-1" /> Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* BULK ACTION BAR */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-none border border-[#1A1C1E] bg-[#1A1C1E] px-2.5 py-1.5 text-white">
                        <span className="text-[11px] font-mono">
                            {selectedIds.length} coupon record{selectedIds.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={exportCsv}
                                className="h-6 rounded-none border-white/20 bg-white/10 px-2 text-[10px] text-white hover:bg-white/20"
                            >
                                Export Selected
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={handleBulkActivate}
                                className="h-6 rounded-none border-emerald-500/50 bg-emerald-900/40 px-2 text-[10px] text-emerald-200 hover:bg-emerald-800/60"
                            >
                                Bulk Activate
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={handleBulkArchive}
                                className="h-6 rounded-none border-amber-500/50 bg-amber-900/40 px-2 text-[10px] text-amber-200 hover:bg-amber-800/60"
                            >
                                Bulk Disable
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={handleBulkDestroy}
                                className="h-6 rounded-none border-red-500/50 bg-red-900/40 px-2 text-[10px] text-red-200 hover:bg-red-800/60"
                            >
                                Bulk Delete
                            </Button>
                        </div>
                    </div>
                )}

                {/* TABLE OF COUPONS & DISCOUNTS */}
                <div className="rounded-none border border-[#E5E7EB] bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] font-mono uppercase tracking-wider text-[#4A4E5A]">
                                    <th className="w-8 px-2 py-2 text-center border-r border-[#E5E7EB]">
                                        <Checkbox
                                            checked={rows.length > 0 && selectedIds.length === rows.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Promo Code / Name</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Discount Value</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Min Spend / Max Cap</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Applicable Category</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Usage / Limit</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Status</th>
                                    <th className="w-20 px-2 py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                                {rows.length > 0 ? (
                                    rows.map((d) => (
                                        <tr
                                            key={d.id}
                                            className={`transition-colors hover:bg-[#F9FAFB] ${selectedIds.includes(d.id) ? 'bg-[#F3F4F6]' : ''}`}
                                        >
                                            <td className="px-2 py-1.5 text-center border-r border-[#E5E7EB]">
                                                <Checkbox
                                                    checked={selectedIds.includes(d.id)}
                                                    onCheckedChange={() => toggleSelectRow(d.id)}
                                                />
                                            </td>

                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-[#1A1C1E] bg-[#1A1C1E] text-white">
                                                        <Tag size={12} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-[11px] font-bold text-[#0052CC] uppercase tracking-wide">
                                                                {d.code}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyCode(d.code)}
                                                                className="text-[#6B7280] hover:text-[#1A1C1E]"
                                                                title="Copy Coupon Code"
                                                            >
                                                                {copiedCode === d.code ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                                            </button>
                                                        </div>
                                                        <p className="truncate text-[10.5px] text-[#1A1C1E]">{d.name}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <span className="font-mono font-bold text-[11px] text-[#1A1C1E]">
                                                    {formatValue(d)}
                                                </span>
                                            </td>

                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] font-mono text-[10px] text-[#4A4E5A]">
                                                <div>Min: ₱{parseFloat(d.min_order_amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                                {d.max_discount_amount && <div>Max Cap: ₱{parseFloat(d.max_discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>}
                                            </td>

                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <span className="inline-block rounded-none border border-[#D1D5DB] bg-[#F9FAFB] px-1.5 py-0.5 text-[9.5px] font-mono text-[#374151]">
                                                    {d.applicable_category || 'All Services'}
                                                </span>
                                            </td>

                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center font-mono text-[10.5px]">
                                                <span className="font-semibold text-[#1A1C1E]">{d.used_count}</span>
                                                <span className="text-[#8A8FA3]"> / {d.usage_limit ? d.usage_limit : '∞'}</span>
                                            </td>

                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center">
                                                {statusBadge(d.status)}
                                            </td>

                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setViewId(d.id)}
                                                        className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB]"
                                                        title="Quick View"
                                                    >
                                                        <Eye size={12} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditModal(d)}
                                                        className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB]"
                                                        title="Edit Coupon"
                                                    >
                                                        <Pencil size={12} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteSingle(d)}
                                                        className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-red-50 hover:text-red-700"
                                                        title="Archive Coupon"
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-none border border-[#D1D5DB] bg-[#F9FAFB]">
                                                <Tag size={16} className="text-[#6B7280]" />
                                            </div>
                                            <p className="mt-2 text-xs font-mono text-[#1A1C1E]">NO DISCOUNT OFFERS FOUND</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Adjust search filters or create a new coupon code.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION FOOTER */}
                    <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1.5 text-[10.5px] font-normal text-[#1A1C1E]">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-muted-foreground">Rows per page:</span>
                            <Select
                                value={String(discounts?.per_page ?? 10)}
                                onValueChange={(v) => router.get('/discounts', { ...(filters ?? {}), per_page: v }, { preserveState: true })}
                            >
                                <SelectTrigger className="h-6 w-[60px] rounded-none border-[#D1D5DB] text-[10px] font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="font-mono text-muted-foreground">
                                Showing {discounts?.from ?? 0}-{discounts?.to ?? 0} of {discounts?.total ?? 0}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(discounts?.current_page ?? 1) <= 1}
                                    onClick={() => router.get('/discounts', { ...(filters ?? {}), page: (discounts?.current_page ?? 1) - 1 })}
                                >
                                    <ChevronLeft size={12} />
                                </Button>
                                <span className="px-1.5 font-mono text-[11px]">
                                    {discounts?.current_page ?? 1} / {discounts?.last_page ?? 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(discounts?.current_page ?? 1) >= (discounts?.last_page ?? 1)}
                                    onClick={() => router.get('/discounts', { ...(filters ?? {}), page: (discounts?.current_page ?? 1) + 1 })}
                                >
                                    <ChevronRight size={12} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CREATE / EDIT MODAL */}
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-md">
                        <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                            <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E]">
                                {editingDiscount ? `Edit Coupon [${editingDiscount.code}]` : 'Create New Promotional Coupon'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSaveDiscount} className="space-y-3 font-sans text-xs pt-1">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Coupon Code *</label>
                                    <Input
                                        required
                                        value={formCode}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. PRINT10"
                                        className="h-7 uppercase font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Offer Type *</label>
                                    <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                                        <SelectTrigger className="h-7 rounded-none border-[#D1D5DB] text-xs font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed_amount">Fixed Amount (₱)</SelectItem>
                                            <SelectItem value="free_shipping">Free Shipping</SelectItem>
                                            <SelectItem value="bulk_print">Bulk Order Deal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Title / Campaign Name *</label>
                                <Input
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. 10% Off All Printing Orders"
                                    className="h-7 text-xs rounded-none border-[#D1D5DB]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Discount Value *</label>
                                    <Input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={formValue}
                                        onChange={(e) => setFormValue(e.target.value)}
                                        placeholder="10 or 500"
                                        className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Min Order Amount (₱)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formMinSpend}
                                        onChange={(e) => setFormMinSpend(e.target.value)}
                                        placeholder="500"
                                        className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Max Discount Cap (₱)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formMaxDiscount}
                                        onChange={(e) => setFormMaxDiscount(e.target.value)}
                                        placeholder="Optional cap"
                                        className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Usage Limit Count</label>
                                    <Input
                                        type="number"
                                        value={formLimit}
                                        onChange={(e) => setFormLimit(e.target.value)}
                                        placeholder="e.g. 100"
                                        className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Applicable Category</label>
                                    <Select value={formCategory} onValueChange={setFormCategory}>
                                        <SelectTrigger className="h-7 rounded-none border-[#D1D5DB] text-xs font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {CATEGORY_OPTIONS.map((c) => (
                                                <SelectItem key={c.value} value={c.value} className="text-xs">
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Status</label>
                                    <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                                        <SelectTrigger className="h-7 rounded-none border-[#D1D5DB] text-xs font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {STATUS_OPTIONS.filter((s) => s.value !== 'all').map((s) => (
                                                <SelectItem key={s.value} value={s.value} className="text-xs">
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Description / Internal Note</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Add promotional details or terms..."
                                    className="w-full rounded-none border border-[#D1D5DB] p-2 text-xs outline-none focus:border-[#1A1C1E]"
                                />
                            </div>

                            <DialogFooter className="pt-2 border-t border-[#E5E7EB]">
                                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)} className="h-7 rounded-none border-[#D1D5DB] text-xs font-normal">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-7 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                    {editingDiscount ? 'Update Coupon' : 'Save Coupon'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* QUICK DETAIL MODAL */}
                {viewing && (
                    <Dialog open={!!viewing} onOpenChange={() => setViewId(null)}>
                        <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-md">
                            <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                                <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E] flex items-center justify-between">
                                    <span className="text-[#0052CC]">{viewing.code}</span>
                                    {statusBadge(viewing.status)}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-3 font-sans text-xs pt-1">
                                <div>
                                    <h4 className="font-bold text-[#1A1C1E] text-sm">{viewing.name}</h4>
                                    <p className="mt-1 text-[#6B7280]">{viewing.description || 'No detailed description.'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-b border-[#E5E7EB] py-2 font-mono text-[11px]">
                                    <div>
                                        <p className="text-[#8A8FA3]">Discount Value:</p>
                                        <p className="font-bold text-[#1A1C1E]">{formatValue(viewing)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#8A8FA3]">Min Spend:</p>
                                        <p className="font-bold text-[#1A1C1E]">₱{parseFloat(viewing.min_order_amount || '0').toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#8A8FA3]">Usage Claims:</p>
                                        <p className="font-bold text-[#1A1C1E]">{viewing.used_count} / {viewing.usage_limit || 'Unlimited'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#8A8FA3]">Category:</p>
                                        <p className="font-bold text-[#1A1C1E]">{viewing.applicable_category || 'All Services'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between font-mono text-[10px] text-[#6B7280]">
                                    <span>Created: {new Date(viewing.created_at).toLocaleDateString()}</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyCode(viewing.code)}
                                        className="h-6 rounded-none border-[#D1D5DB] px-2 text-[10px]"
                                    >
                                        <Copy size={11} className="mr-1" /> Copy Code
                                    </Button>
                                </div>
                            </div>

                            <DialogFooter className="pt-2 border-t border-[#E5E7EB]">
                                <Button variant="outline" onClick={() => setViewId(null)} className="h-7 rounded-none border-[#D1D5DB] text-xs font-normal">
                                    Close
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </>
    );
}
