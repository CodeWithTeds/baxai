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
    Boxes,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileText,
    Layer,
    Pencil,
    Printer,
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

interface PrintCategoryRow {
    id: number;
    name: string;
    slug: string;
    code: string;
    description: string | null;
    status: string;
    print_items_count?: number;
}

interface PrintItemRow {
    id: number;
    name: string;
    item_code: string;
    category_id: number;
    category?: PrintCategoryRow | null;
    description: string | null;
    paper_type: string | null;
    paper_size: string | null;
    print_sides: string;
    color_mode: string;
    turnaround_time: string;
    base_price: string | number;
    min_quantity: number;
    status: string;
    notes: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface Paginated {
    data: PrintItemRow[];
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
    { value: 'draft', label: 'Draft' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
];

const PRINT_SIDES_OPTIONS = [
    { value: 'all', label: 'All Print Sides' },
    { value: 'single_sided', label: 'Single-Sided (1S)' },
    { value: 'double_sided', label: 'Double-Sided (2S)' },
    { value: 'variable', label: 'Variable / Custom' },
];

const COLOR_MODE_OPTIONS = [
    { value: 'all', label: 'All Color Modes' },
    { value: 'full_color', label: 'Full Color (CMYK)' },
    { value: 'monochrome', label: 'Monochrome (B&W)' },
    { value: 'grayscale', label: 'Grayscale' },
];

const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: '-base_price', label: 'Price (High to Low)' },
    { value: 'base_price', label: 'Price (Low to High)' },
];

export default function PrintItemsIndex({
    items = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated,
    categories = [] as PrintCategoryRow[],
    filters = {},
    stats = { total: 0, active: 0, draft: 0, categories: 0 },
}: {
    items?: Paginated;
    categories?: PrintCategoryRow[];
    filters?: Record<string, any>;
    stats?: { total: number; active: number; draft: number; categories: number };
}) {
    const safeFilters = filters || {};
    const rawFilter = (safeFilters.filter && typeof safeFilters.filter === 'object' ? safeFilters.filter : {}) as Record<string, string>;

    const [search, setSearch] = useState<string>(rawFilter.search ?? '');
    const [status, setStatus] = useState<string>(rawFilter.status ?? 'all');
    const [categoryId, setCategoryId] = useState<string>(rawFilter.category_id ?? 'all');
    const [printSides, setPrintSides] = useState<string>(rawFilter.print_sides ?? 'all');
    const [colorMode, setColorMode] = useState<string>(rawFilter.color_mode ?? 'all');
    const [sort, setSort] = useState<string>(typeof safeFilters.sort === 'string' ? safeFilters.sort : '-created_at');
    const [perPage, setPerPage] = useState<string>(String(safeFilters.per_page ?? 10));

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [quickViewItem, setQuickViewItem] = useState<PrintItemRow | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const safeData = Array.isArray(items?.data) ? items.data : [];

    const handleFilterChange = (updates: Record<string, string>) => {
        const query: Record<string, unknown> = {
            filter: {
                search: updates.search ?? search,
                status: (updates.status ?? status) === 'all' ? undefined : (updates.status ?? status),
                category_id: (updates.category_id ?? categoryId) === 'all' ? undefined : (updates.category_id ?? categoryId),
                print_sides: (updates.print_sides ?? printSides) === 'all' ? undefined : (updates.print_sides ?? printSides),
                color_mode: (updates.color_mode ?? colorMode) === 'all' ? undefined : (updates.color_mode ?? colorMode),
            },
            sort: updates.sort ?? sort,
            per_page: updates.per_page ?? perPage,
        };

        // Clean empty values
        Object.keys(query.filter as Record<string, unknown>).forEach((k) => {
            if (!(query.filter as Record<string, unknown>)[k]) {
                delete (query.filter as Record<string, unknown>)[k];
            }
        });

        router.get('/print-items', query as never, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setCategoryId('all');
        setPrintSides('all');
        setColorMode('all');
        setSort('-created_at');
        router.get('/print-items', {}, { preserveState: true, replace: true });
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

    const handleBulkAction = (action: 'activate' | 'archive' | 'destroy') => {
        if (selectedIds.length === 0) return;
        if (action === 'destroy' && !confirm(`Permanently delete ${selectedIds.length} print item(s)?`)) return;

        router.post(
            `/print-items/bulk-${action}`,
            { ids: selectedIds },
            {
                onSuccess: () => setSelectedIds([]),
            }
        );
    };

    const exportCsv = () => {
        const headers = ['ID', 'Name', 'Item Code', 'Category', 'Paper Type', 'Size', 'Print Sides', 'Color Mode', 'Price', 'Min Qty', 'Status'];
        const rows = safeData.map((i) => [
            i.id,
            `"${i.name.replace(/"/g, '""')}"`,
            i.item_code,
            `"${i.category?.name ?? 'Uncategorized'}"`,
            `"${i.paper_type ?? ''}"`,
            `"${i.paper_size ?? ''}"`,
            i.print_sides,
            i.color_mode,
            i.base_price,
            i.min_quantity,
            i.status,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `printing_services_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const prettySides = (val: string) => {
        if (val === 'single_sided') return '1S (Single-Sided)';
        if (val === 'double_sided') return '2S (Double-Sided)';
        return 'Variable / Custom';
    };

    const prettyColor = (val: string) => {
        if (val === 'full_color') return 'Full Color (CMYK)';
        if (val === 'monochrome') return 'Monochrome (B&W)';
        return 'Grayscale';
    };

    return (
        <div className="font-sans text-[#1A1C1E]">
            <Head title="Printing Services — Admin" />

            {/* HEADER AREA */}
            <div className="mb-2.5 border-b border-[#E5E7EB] pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <Printer className="h-4 w-4 text-[#1A1C1E]" />
                            <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                                Printing Services <span className="font-mono text-xs text-muted-foreground">({stats.total})</span>
                            </h1>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                            Manage commercial print products, paper stock specifications, pricing rules, and printing categories.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Link href="/print-categories">
                            <Button variant="outline" className="h-7 rounded-none border-[#D1D5DB] px-2.5 text-[11px] font-mono text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]">
                                <Boxes size={12} className="mr-1.5" />
                                Manage Categories ({stats.categories})
                            </Button>
                        </Link>
                        <Link href="/print-items/create">
                            <Button className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white hover:bg-black">
                                <Plus size={13} className="mr-1" />
                                Add Print Service
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="mt-2 flex items-center gap-2 border-t border-[#E5E7EB] pt-1.5 font-mono text-xs">
                    <Link
                        href="/print-items"
                        className="border-b-2 border-[#1A1C1E] pb-0.5 font-bold text-[#1A1C1E]"
                    >
                        Print Items ({stats.total})
                    </Link>
                    <span className="text-[#D1D5DB]">|</span>
                    <Link
                        href="/print-categories"
                        className="pb-0.5 text-[#6B7280] hover:text-[#1A1C1E]"
                    >
                        Print Categories ({stats.categories})
                    </Link>
                </div>
            </div>

            {/* FILTER TOOLBAR PANEL */}
            <div className="mb-2.5 rounded-none border border-[#E5E7EB] bg-white p-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        {/* SEARCH INPUT */}
                        <div className="relative flex-1 min-w-[180px] max-w-sm">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8A8FA3]" />
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilterChange({ search: e.target.value });
                                }}
                                placeholder="Search print item name, code, paper type..."
                                className="h-7 rounded-none border-[#D1D5DB] pl-8 text-[11px] placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0"
                            />
                        </div>

                        {/* CATEGORY SELECT */}
                        <Select
                            value={categoryId}
                            onValueChange={(v) => {
                                setCategoryId(v);
                                handleFilterChange({ category_id: v });
                            }}
                        >
                            <SelectTrigger className="h-7 w-[150px] rounded-none border-[#D1D5DB] text-[11px] font-mono">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="all" className="text-xs font-mono">All Categories</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* STATUS SELECT */}
                        <Select
                            value={status}
                            onValueChange={(v) => {
                                setStatus(v);
                                handleFilterChange({ status: v });
                            }}
                        >
                            <SelectTrigger className="h-7 w-[120px] rounded-none border-[#D1D5DB] text-[11px] font-mono">
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

                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-7 rounded-none border-[#D1D5DB] px-2 text-[11px] font-mono ${
                                showFilters || printSides !== 'all' || colorMode !== 'all' ? 'bg-[#F3F4F6] font-bold text-[#1A1C1E]' : 'text-[#4A4E5A]'
                            }`}
                        >
                            <SlidersHorizontal size={12} className="mr-1" />
                            More Filters
                        </Button>

                        {(search || status !== 'all' || categoryId !== 'all' || printSides !== 'all' || colorMode !== 'all') && (
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
                            <SelectTrigger className="h-7 w-[150px] rounded-none border-[#D1D5DB] text-[11px] font-mono">
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
                            className="h-8 rounded-none border-[#D1D5DB] px-2 text-xs font-mono text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                        >
                            <Download size={13} className="mr-1" />
                            CSV
                        </Button>
                    </div>
                </div>

                {/* EXPANDABLE HEAVY FILTER ROW */}
                {showFilters && (
                    <div className="mt-3 border-t border-[#E5E7EB] pt-3 grid gap-2 sm:grid-cols-3">
                        <div>
                            <p className="mb-1 font-mono text-[10px] text-[#4A4E5A]">Print Sides</p>
                            <Select
                                value={printSides}
                                onValueChange={(v) => {
                                    setPrintSides(v);
                                    handleFilterChange({ print_sides: v });
                                }}
                            >
                                <SelectTrigger className="h-8 w-full rounded-none border-[#D1D5DB] text-xs font-mono">
                                    <SelectValue placeholder="All Print Sides" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    {PRINT_SIDES_OPTIONS.map((ps) => (
                                        <SelectItem key={ps.value} value={ps.value} className="text-xs">
                                            {ps.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="mb-1 font-mono text-[10px] text-[#4A4E5A]">Color Mode</p>
                            <Select
                                value={colorMode}
                                onValueChange={(v) => {
                                    setColorMode(v);
                                    handleFilterChange({ color_mode: v });
                                }}
                            >
                                <SelectTrigger className="h-8 w-full rounded-none border-[#D1D5DB] text-xs font-mono">
                                    <SelectValue placeholder="All Color Modes" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    {COLOR_MODE_OPTIONS.map((cm) => (
                                        <SelectItem key={cm.value} value={cm.value} className="text-xs">
                                            {cm.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="mb-1 font-mono text-[10px] text-[#4A4E5A]">Rows Per Page</p>
                            <Select
                                value={perPage}
                                onValueChange={(v) => {
                                    setPerPage(v);
                                    handleFilterChange({ per_page: v });
                                }}
                            >
                                <SelectTrigger className="h-8 w-full rounded-none border-[#D1D5DB] text-xs font-mono">
                                    <SelectValue placeholder="Per page" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="10" className="text-xs">10 per page</SelectItem>
                                    <SelectItem value="25" className="text-xs">25 per page</SelectItem>
                                    <SelectItem value="50" className="text-xs">50 per page</SelectItem>
                                    <SelectItem value="100" className="text-xs">100 per page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* BULK SELECTION ACTION BAR */}
            {selectedIds.length > 0 && (
                <div className="mb-3 flex items-center justify-between rounded-none border border-[#1A1C1E] bg-[#F9FAFB] px-3 py-2 text-xs">
                    <span className="font-mono text-[#1A1C1E]">
                        Selected <strong>{selectedIds.length}</strong> print item(s)
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkAction('activate')}
                            className="h-7 rounded-none border-[#D1D5DB] text-[11px] font-mono text-[#1A1C1E] bg-white hover:bg-gray-100"
                        >
                            Set Active
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkAction('archive')}
                            className="h-7 rounded-none border-[#D1D5DB] text-[11px] font-mono text-[#1A1C1E] bg-white hover:bg-gray-100"
                        >
                            Archive
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBulkAction('destroy')}
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
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Print Service & Code</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Category</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Paper Stock & Size</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Sides & Color</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Turnaround</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Base Price</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Min Qty</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Status</th>
                            <th className="px-2 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                        {safeData.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-8 text-center text-xs font-mono text-[#8A8FA3]">
                                    No print services found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            safeData.map((item) => (
                                <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                                    <td className="px-2 py-1.5 text-center border-r border-[#E5E7EB]">
                                        <Checkbox
                                            checked={selectedIds.includes(item.id)}
                                            onCheckedChange={() => toggleSelect(item.id)}
                                            className="rounded-none border-[#D1D5DB]"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div className="font-semibold text-[#1A1C1E]">{item.name}</div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">{item.item_code}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <span className="inline-block rounded-none border border-[#D1D5DB] bg-[#F9FAFB] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#374151]">
                                            {item.category?.name ?? 'General'}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div className="text-[11px] text-[#1A1C1E]">{item.paper_type || 'Standard Stock'}</div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">{item.paper_size || 'Custom Size'}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div className="font-mono text-[10px] text-[#1A1C1E]">
                                            {prettySides(item.print_sides)}
                                        </div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">
                                            {prettyColor(item.color_mode)}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] font-mono text-[11px] text-[#4A4E5A]">
                                        {item.turnaround_time}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono font-bold text-[#1A1C1E]">
                                        ₱{Number(item.base_price).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center font-mono text-xs text-[#1A1C1E]">
                                        {item.min_quantity} {item.min_quantity === 1 ? 'pc' : 'pcs'}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center">
                                        <span className={`inline-block rounded-none border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                                            item.status === 'active'
                                                ? 'border-[#D1D5DB] bg-white text-[#1A1C1E]'
                                                : item.status === 'draft'
                                                ? 'border-gray-300 bg-gray-50 text-gray-600'
                                                : 'border-gray-200 bg-gray-100 text-gray-500'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setQuickViewItem(item)}
                                                title="Quick View"
                                                className="h-7 w-7 rounded-none hover:bg-gray-100 text-[#4A4E5A]"
                                            >
                                                <Eye size={13} />
                                            </Button>
                                            <Link href={`/print-items/${item.id}/edit`}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Edit Item"
                                                    className="h-7 w-7 rounded-none hover:bg-gray-100 text-[#4A4E5A]"
                                                >
                                                    <Pencil size={13} />
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
                    Showing <strong>{items.from ?? 0}</strong> to <strong>{items.to ?? 0}</strong> of <strong>{items.total ?? 0}</strong> print items
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={items.current_page <= 1}
                        onClick={() => router.get('/print-items', { ...filters, page: items.current_page - 1 } as never)}
                        className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                    >
                        <ChevronLeft size={13} className="mr-1" /> Prev
                    </Button>
                    <span className="px-2 font-bold text-[#1A1C1E]">
                        Page {items.current_page} of {items.last_page}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={items.current_page >= items.last_page}
                        onClick={() => router.get('/print-items', { ...filters, page: items.current_page + 1 } as never)}
                        className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                    >
                        Next <ChevronRight size={13} className="ml-1" />
                    </Button>
                </div>
            </div>

            {/* QUICK VIEW MODAL */}
            {quickViewItem && (
                <Dialog open={!!quickViewItem} onOpenChange={() => setQuickViewItem(null)}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-mono text-base text-[#1A1C1E] flex items-center justify-between">
                                <span>{quickViewItem.name}</span>
                                <span className="text-xs font-normal text-muted-foreground">[{quickViewItem.item_code}]</span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 font-sans text-xs">
                            <div className="grid grid-cols-2 gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-[11px]">
                                <div>
                                    <span className="text-[#6B7280]">Category:</span>{' '}
                                    <strong className="text-[#1A1C1E]">{quickViewItem.category?.name ?? 'General'}</strong>
                                </div>
                                <div>
                                    <span className="text-[#6B7280]">Status:</span>{' '}
                                    <strong className="uppercase text-[#1A1C1E]">{quickViewItem.status}</strong>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#4A4E5A]">Description</h4>
                                <p className="mt-0.5 text-xs text-[#374151] leading-relaxed">
                                    {quickViewItem.description || 'No detailed description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-b border-[#E5E7EB] py-2 font-mono text-[11px]">
                                <div>
                                    <p className="text-[#6B7280]">Paper Stock:</p>
                                    <p className="font-semibold text-[#1A1C1E]">{quickViewItem.paper_type || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280]">Paper Size:</p>
                                    <p className="font-semibold text-[#1A1C1E]">{quickViewItem.paper_size || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280]">Print Sides:</p>
                                    <p className="font-semibold text-[#1A1C1E]">{prettySides(quickViewItem.print_sides)}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280]">Color Mode:</p>
                                    <p className="font-semibold text-[#1A1C1E]">{prettyColor(quickViewItem.color_mode)}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280]">Turnaround:</p>
                                    <p className="font-semibold text-[#1A1C1E]">{quickViewItem.turnaround_time}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280]">Base Price:</p>
                                    <p className="font-bold text-[#1A1C1E]">₱{Number(quickViewItem.base_price).toFixed(2)} / {quickViewItem.min_quantity} pcs</p>
                                </div>
                            </div>

                            {quickViewItem.notes && (
                                <div>
                                    <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#4A4E5A]">Notes & Special Rules</h4>
                                    <p className="mt-0.5 text-xs text-[#4B5563] italic">{quickViewItem.notes}</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-2 border-t border-[#E5E7EB] pt-2">
                            <Link href={`/print-items/${quickViewItem.id}/edit`}>
                                <Button className="h-8 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                    Edit Print Item
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={() => setQuickViewItem(null)}
                                className="h-8 rounded-none border-[#D1D5DB] text-xs font-normal text-[#1A1C1E]"
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

PrintItemsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Printing Services',
            href: '/print-items',
        },
    ],
};
