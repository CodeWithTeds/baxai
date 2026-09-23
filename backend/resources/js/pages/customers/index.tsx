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
    Building2,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Mail,
    Pencil,
    Phone,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
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

interface CustomerRow {
    id: number;
    name: string;
    customer_code: string;
    email: string;
    phone: string | null;
    company: string | null;
    status: string;
    type: string;
    avatar: string | null;
    notes: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    total_orders: number;
    total_spent: string;
    created_at: string;
    updated_at: string;
}

interface Paginated {
    data: CustomerRow[];
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
    { value: 'lead', label: 'Lead' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
];

const TYPE_OPTIONS = [
    { value: 'all', label: 'All Customer Types' },
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' },
    { value: 'vip', label: 'VIP' },
    { value: 'wholesale', label: 'Wholesale' },
];

const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: '-total_spent', label: 'Spent (High to Low)' },
    { value: '-total_orders', label: 'Orders (High to Low)' },
];

export default function CustomersIndex({
    customers = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated,
    filters = {},
    stats = { total: 0, active: 0, lead: 0, vip: 0 },
}: {
    customers?: Paginated;
    filters?: Record<string, unknown>;
    stats?: { total: number; active: number; lead: number; vip: number };
}) {
    const pageProps = usePage().props as unknown as {
        flash?: { success?: string };
    };
    const flash = pageProps.flash ?? {};
    const rows = Array.isArray(customers?.data) ? customers.data : [];

    const initialFilter = (typeof filters?.filter === 'object' && filters?.filter !== null
        ? filters.filter
        : {}) as Record<string, string>;

    const initialSort = typeof filters?.sort === 'string' && filters.sort ? filters.sort : '-created_at';

    const [search, setSearch] = useState<string>(
        typeof initialFilter.search === 'string' ? initialFilter.search : (typeof initialFilter.name === 'string' ? initialFilter.name : '')
    );
    const [status, setStatus] = useState<string>(typeof initialFilter.status === 'string' ? initialFilter.status : 'all');
    const [type, setType] = useState<string>(typeof initialFilter.type === 'string' ? initialFilter.type : 'all');
    const [minSpent, setMinSpent] = useState<string>(typeof initialFilter.min_spent === 'string' ? initialFilter.min_spent : '');
    const [minOrders, setMinOrders] = useState<string>(typeof initialFilter.min_orders === 'string' ? initialFilter.min_orders : '');
    const [sort, setSort] = useState<string>(initialSort);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [viewId, setViewId] = useState<number | null>(null);
    const [archiving, setArchiving] = useState<boolean>(false);
    const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);

    const viewing = rows.find((c) => c && c.id === viewId) ?? null;

    const closeView = () => setViewId(null);

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

    const handleBulkActivate = () => {
        if (selectedIds.length === 0) return;
        setBulkProcessing(true);
        router.post(
            '/customers/bulk-activate',
            { ids: selectedIds },
            {
                onFinish: () => {
                    setBulkProcessing(false);
                    setSelectedIds([]);
                },
            },
        );
    };

    const handleBulkArchive = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Archive ${selectedIds.length} selected customer(s)?`)) return;
        setBulkProcessing(true);
        router.post(
            '/customers/bulk-archive',
            { ids: selectedIds },
            {
                onFinish: () => {
                    setBulkProcessing(false);
                    setSelectedIds([]);
                },
            },
        );
    };

    const handleBulkDestroy = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Permanently delete ${selectedIds.length} selected customer(s)?`)) return;
        setBulkProcessing(true);
        router.post(
            '/customers/bulk-destroy',
            { ids: selectedIds },
            {
                onFinish: () => {
                    setBulkProcessing(false);
                    setSelectedIds([]);
                },
            },
        );
    };

    const archiveSingle = (customer: CustomerRow) => {
        if (!confirm(`Archive customer ${customer.name}?`)) return;
        router.delete(`/customers/${customer.id}`, {
            onFinish: () => {
                if (viewId === customer.id) setViewId(null);
            },
        });
    };

    const archiveViewed = () => {
        if (!viewing) return;
        setArchiving(true);
        router.delete(`/customers/${viewing.id}`, {
            onFinish: () => {
                setArchiving(false);
                setViewId(null);
            },
        });
    };

    const applyFilters = () => {
        const filter: Record<string, string> = {};
        if (search.trim()) filter.search = search.trim();
        if (status !== 'all') filter.status = status;
        if (type !== 'all') filter.type = type;
        if (minSpent.trim()) filter.min_spent = minSpent.trim();
        if (minOrders.trim()) filter.min_orders = minOrders.trim();

        router.get(
            '/customers',
            { filter, sort, per_page: customers?.per_page ?? 10 },
            { preserveState: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setType('all');
        setMinSpent('');
        setMinOrders('');
        setSort('-created_at');
        router.get('/customers', {}, { preserveState: true });
    };

    const exportCsv = () => {
        const targetData = selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
        if (!targetData || targetData.length === 0) {
            alert('No customer records available to export.');
            return;
        }

        const headers = ['ID', 'Customer Code', 'Name', 'Email', 'Phone', 'Company', 'Type', 'Status', 'Address', 'City', 'State', 'Postal Code', 'Country', 'Notes', 'Total Orders', 'Total Spent', 'Created At'];
        const csvRows = [headers.join(',')];

        targetData.forEach((item) => {
            const row = [
                item.id,
                `"${item.customer_code || ''}"`,
                `"${(item.name || '').replace(/"/g, '""')}"`,
                `"${item.email || ''}"`,
                `"${item.phone || ''}"`,
                `"${(item.company || '').replace(/"/g, '""')}"`,
                `"${item.type || ''}"`,
                `"${item.status || ''}"`,
                `"${(item.address || '').replace(/"/g, '""')}"`,
                `"${(item.city || '').replace(/"/g, '""')}"`,
                `"${(item.state || '').replace(/"/g, '""')}"`,
                `"${item.postal_code || ''}"`,
                `"${item.country || ''}"`,
                `"${(item.notes || '').replace(/"/g, '""')}"`,
                item.total_orders ?? 0,
                item.total_spent ?? '0.00',
                `"${item.created_at || ''}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getInitials = (name?: string | null) => {
        if (!name || typeof name !== 'string') return 'CU';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'CU';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    return (
        <>
            <Head title="Customers" />

            <div className="flex flex-col gap-2.5 font-sans text-[#1A1C1E]">
                {/* HEADING SECTION */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
                    <div className="max-w-[640px]">
                        <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                            Customers <span className="font-mono text-xs font-normal text-muted-foreground">({(customers?.total ?? 0).toLocaleString()})</span>
                        </h1>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Compressed high-density customer registry with contact details, account tiers, purchase history, and quick actions.
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
                        <Link href="/customers/create">
                            <Button size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white hover:bg-black">
                                <Plus size={12} className="mr-1" /> Add Customer
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-xs">
                    <button
                        type="button"
                        onClick={resetFilters}
                        className={`pb-1 ${status === 'all' && type === 'all' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        All Customers ({(customers?.total ?? 0).toLocaleString()})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setStatus('active');
                            applyFilters();
                        }}
                        className={`pb-1 ${status === 'active' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        Active Accounts
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setType('vip');
                            applyFilters();
                        }}
                        className={`pb-1 ${type === 'vip' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        VIP Tier
                    </button>
                </div>

                {/* HEAVY DETAILED LINEAR FILTER BAR */}
                <div className="rounded-none border border-[#E5E7EB] bg-white p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Search Input */}
                        <div className="relative min-w-[220px] flex-1">
                            <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters();
                                }}
                                placeholder="Search name, code, email, company, city..."
                                className="h-7 w-full rounded-none border-[#D1D5DB] pl-7 text-[11px] font-normal placeholder:text-[#8A8FA3]"
                            />
                        </div>

                        {/* Status Select */}
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

                        {/* Type Select */}
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {TYPE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Sort Order Select */}
                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <span className="flex items-center gap-1 truncate">
                                    <ArrowUpDown size={11} className="text-muted-foreground" />
                                    <SelectValue placeholder="Sort by" />
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

                        {/* Action buttons */}
                        <Button onClick={applyFilters} size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-3 text-[11px] font-normal text-white hover:bg-black">
                            Filter
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="h-7 rounded-none border border-[#E5E7EB] px-2 text-[11px] font-normal text-[#4A4E5A] hover:bg-[#F9FAFB]"
                        >
                            <SlidersHorizontal size={12} className="mr-1" />
                            {showAdvanced ? 'Hide Detailed' : 'Detailed Filters'}
                        </Button>

                        {(search || status !== 'all' || type !== 'all' || minSpent || minOrders || sort !== '-created_at') && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={resetFilters}
                                className="h-7 rounded-none px-1.5 text-[11px] font-normal text-red-600 hover:bg-red-50"
                                title="Reset all filters"
                            >
                                <RotateCcw size={11} className="mr-1" /> Reset
                            </Button>
                        )}
                    </div>

                    {/* EXPANDABLE DETAILED LINEAR FILTERS */}
                    {showAdvanced && (
                        <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Min Spent (₱):</span>
                                <Input
                                    type="number"
                                    min="0"
                                    value={minSpent}
                                    onChange={(e) => setMinSpent(e.target.value)}
                                    placeholder="e.g. 5000"
                                    className="h-6.5 rounded-none border-[#D1D5DB] text-[11px] font-normal"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Min Orders:</span>
                                <Input
                                    type="number"
                                    min="0"
                                    value={minOrders}
                                    onChange={(e) => setMinOrders(e.target.value)}
                                    placeholder="e.g. 5"
                                    className="h-6.5 rounded-none border-[#D1D5DB] text-[11px] font-normal"
                                />
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-2 text-[10px] text-[#6B7280]">
                                <span>Refine query results across all columns</span>
                                <Button onClick={applyFilters} size="sm" className="h-6.5 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white">
                                    Apply Heavy Filters
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* BULK ACTION BAR */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-none border border-[#1A1C1E] bg-[#1A1C1E] px-2.5 py-1.5 text-white">
                        <span className="text-[11px] font-mono">
                            {selectedIds.length} customer record{selectedIds.length > 1 ? 's' : ''} selected
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
                                Bulk Archive
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

                {/* COMPRESSED 10-COLUMN HIGH DENSITY PURE SQUARE TABLE */}
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
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Customer Code / Name</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Contact</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Company</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Type</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Status</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Orders</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Total Spent</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Registered</th>
                                    <th className="w-20 px-2 py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                                {rows.length > 0 ? (
                                    rows.map((c) => (
                                        <tr
                                            key={c.id}
                                            className={`transition-colors hover:bg-[#F9FAFB] ${selectedIds.includes(c.id) ? 'bg-[#F3F4F6]' : ''}`}
                                        >
                                            {/* 1. Checkbox */}
                                            <td className="px-2 py-1.5 text-center border-r border-[#E5E7EB]">
                                                <Checkbox
                                                    checked={selectedIds.includes(c.id)}
                                                    onCheckedChange={() => toggleSelectRow(c.id)}
                                                />
                                            </td>

                                            {/* 2. Customer Code / Name */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-[#1A1C1E] bg-[#1A1C1E] text-[9px] font-mono text-white">
                                                        {getInitials(c.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewId(c.id)}
                                                            className="block truncate text-[11px] font-medium text-[#1A1C1E] hover:underline text-left"
                                                        >
                                                            {c.name}
                                                        </button>
                                                        <p className="font-mono text-[9.5px] text-[#6B7280]">{c.customer_code}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 3. Contact */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-1 truncate text-[11px] text-[#1A1C1E]">
                                                        <Mail size={11} className="shrink-0 text-[#6B7280]" />
                                                        <span className="truncate">{c.email}</span>
                                                    </div>
                                                    {c.phone ? (
                                                        <div className="flex items-center gap-1 truncate text-[9.5px] font-mono text-[#6B7280]">
                                                            <Phone size={10} className="shrink-0 text-[#6B7280]" />
                                                            <span className="truncate">{c.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9.5px] text-[#8A8FA3]">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 4. Company */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                {c.company ? (
                                                    <div className="flex items-center gap-1 text-[11px] text-[#1A1C1E] truncate">
                                                        <Building2 size={11} className="shrink-0 text-[#6B7280]" />
                                                        <span className="truncate">{c.company}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-[#8A8FA3]">—</span>
                                                )}
                                            </td>

                                            {/* 5. Type */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <span className="inline-block rounded-none border border-[#D1D5DB] bg-white px-1.5 py-0.5 text-[9.5px] font-mono tracking-wider text-[#374151] uppercase">
                                                    {c.type}
                                                </span>
                                            </td>

                                            {/* 6. Status */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            c.status === 'active'
                                                                ? 'bg-[#1A1C1E]'
                                                                : c.status === 'lead'
                                                                  ? 'bg-gray-500'
                                                                  : 'bg-gray-300'
                                                        }`}
                                                    />
                                                    <span className="text-[10.5px] font-mono text-[#1A1C1E] capitalize">
                                                        {c.status}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 7. Orders */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono text-[10.5px] text-[#1A1C1E]">
                                                {c.total_orders ?? 0}
                                            </td>

                                            {/* 8. Total Spent */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono text-[10.5px] font-medium text-[#1A1C1E]">
                                                ₱{Number(c.total_spent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* 9. Registered Date */}
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center font-mono text-[10px] text-[#6B7280]">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Calendar size={10} className="text-[#8A8FA3]" />
                                                    <span>{formatDate(c.created_at)}</span>
                                                </div>
                                            </td>

                                            {/* 10. Actions */}
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setViewId(c.id)}
                                                        className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB] hover:text-[#1A1C1E]"
                                                        title="Quick View"
                                                    >
                                                        <Eye size={12} />
                                                    </Button>
                                                    <Link href={`/customers/${c.id}/edit`}>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB] hover:text-[#1A1C1E]"
                                                            title="Edit Customer"
                                                        >
                                                            <Pencil size={12} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => archiveSingle(c)}
                                                        className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-red-50 hover:text-red-700"
                                                        title="Archive Customer"
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center">
                                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-none border border-[#D1D5DB] bg-[#F9FAFB]">
                                                <Users size={16} className="text-[#6B7280]" />
                                            </div>
                                            <p className="mt-2 text-xs font-mono text-[#1A1C1E]">NO CUSTOMERS FOUND</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Adjust filters or create a new customer record.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* CONSISTENT TABLE FOOTER / PAGINATION */}
                    <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1.5 text-[10.5px] font-normal text-[#1A1C1E]">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-muted-foreground">Rows per page:</span>
                            <Select
                                value={String(customers?.per_page ?? 10)}
                                onValueChange={(v) => router.get('/customers', { ...(filters ?? {}), per_page: v }, { preserveState: true })}
                            >
                                <SelectTrigger className="h-6 w-[60px] rounded-none border-[#D1D5DB] text-[10px] font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="font-mono text-muted-foreground">
                                Showing {customers?.from ?? 0}-{customers?.to ?? 0} of {customers?.total ?? 0}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(customers?.current_page ?? 1) <= 1}
                                    onClick={() => router.get('/customers', { ...(filters ?? {}), page: (customers?.current_page ?? 1) - 1 })}
                                >
                                    <ChevronLeft size={12} />
                                </Button>
                                <span className="px-1.5 font-mono text-[11px] text-foreground">
                                    {customers?.current_page ?? 1} / {customers?.last_page ?? 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(customers?.current_page ?? 1) >= (customers?.last_page ?? 1)}
                                    onClick={() => router.get('/customers', { ...(filters ?? {}), page: (customers?.current_page ?? 1) + 1 })}
                                >
                                    <ChevronRight size={12} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUICK VIEW MODAL */}
                <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) closeView(); }}>
                    <DialogContent className="max-h-[90vh] w-full overflow-y-auto rounded-none border-[#1A1C1E] sm:max-w-[720px]">
                        {viewing && (
                            <>
                                <DialogHeader className="border-b border-[#E5E7EB] pb-3">
                                    <DialogTitle className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-[#1A1C1E]">
                                        {viewing.name}
                                        <span className="text-[11px] font-mono font-normal text-[#6B7280]">
                                            [{viewing.customer_code}] · {viewing.type.toUpperCase()} · {viewing.status.toUpperCase()}
                                        </span>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="grid items-start gap-3 sm:grid-cols-2 pt-2">
                                    {/* LEFT — Basic & Contact */}
                                    <div className="space-y-3">
                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Contact Information
                                            </h3>
                                            <dl className="grid gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Full Name</dt><dd className="font-medium text-[#1A1C1E]">{viewing.name}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Customer Code</dt><dd className="font-mono text-[11px] text-[#1A1C1E]">{viewing.customer_code}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Email</dt><dd className="font-mono text-[#1A1C1E]">{viewing.email}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Phone</dt><dd className="font-mono text-[#1A1C1E]">{viewing.phone || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Company</dt><dd className="text-[#1A1C1E]">{viewing.company || '—'}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Account & Notes
                                            </h3>
                                            <dl className="grid gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Status</dt><dd className="font-mono uppercase text-[#1A1C1E]">{viewing.status}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Type</dt><dd className="font-mono uppercase text-[#1A1C1E]">{viewing.type}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Notes</dt><dd className="leading-relaxed text-[#1A1C1E]">{viewing.notes || '—'}</dd></div>
                                            </dl>
                                        </section>
                                    </div>

                                    {/* RIGHT — Address & Activity */}
                                    <div className="space-y-3">
                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Address Details
                                            </h3>
                                            <dl className="grid gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Address</dt><dd className="text-[#1A1C1E]">{viewing.address || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">City</dt><dd className="text-[#1A1C1E]">{viewing.city || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">State / Province</dt><dd className="text-[#1A1C1E]">{viewing.state || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Postal Code</dt><dd className="font-mono text-[#1A1C1E]">{viewing.postal_code || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Country</dt><dd className="text-[#1A1C1E]">{viewing.country || 'Philippines'}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Purchase Summary
                                            </h3>
                                            <dl className="grid grid-cols-2 gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Total Orders</dt><dd className="font-mono text-[#1A1C1E]">{viewing.total_orders ?? 0}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Total Spent</dt><dd className="font-mono font-bold text-[#1A1C1E]">₱{Number(viewing.total_spent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd></div>
                                            </dl>
                                        </section>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 pt-2 border-t border-[#E5E7EB]">
                                    <Button variant="ghost" type="button" onClick={closeView} className="rounded-none">
                                        Close
                                    </Button>
                                    <Button variant="outline" type="button" className="rounded-none text-red-600 border-red-200" disabled={archiving} onClick={archiveViewed}>
                                        {archiving ? 'Archiving…' : 'Archive'}
                                    </Button>
                                    <Link href={`/customers/${viewing.id}/edit`}>
                                        <Button type="button" className="rounded-none bg-[#1A1C1E] text-white hover:bg-black">Edit</Button>
                                    </Link>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Customers',
            href: '/customers',
        },
    ],
};
