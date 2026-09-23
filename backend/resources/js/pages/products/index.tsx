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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Package,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { dashboard } from '@/routes';
import Product3DPreview from '@/components/product-3d-preview';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ProductRow {
    id: number;
    name: string;
    sku: string;
    category: string;
    status: string;
    badge: string | null;
    base_price: string;
    compare_at_price: string | null;
    unit: string | null;
    stock_quantity: number;
    thumbnail: string | null;
    short_description: string | null;
    description: string | null;
    is_customizable: boolean;
    has_3d_preview: boolean;
    viewer_type: string;
    model_3d_url: string | null;
    allow_color_change: boolean;
    available_colors: string[] | null;
    allow_custom_text: boolean;
}

interface Paginated {
    data: ProductRow[];
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

const CATEGORY_OPTIONS = [
    { value: 'all', label: 'All Categories' },
    { value: 'Mugs & Drinkware', label: 'Mugs & Drinkware' },
    { value: 'Apparel & Uniforms', label: 'Apparel & Uniforms' },
    { value: 'Corporate Gifts', label: 'Corporate Gifts' },
    { value: 'Print Media', label: 'Print Media' },
    { value: 'Packaging', label: 'Packaging' },
    { value: 'Accessories', label: 'Accessories' },
];

const CUSTOMIZABLE_OPTIONS = [
    { value: 'all', label: 'All Items' },
    { value: '1', label: 'Customizable Only' },
    { value: '0', label: 'Standard Non-Customizable' },
];

const PREVIEW_3D_OPTIONS = [
    { value: 'all', label: 'All Media Types' },
    { value: '1', label: '3D Preview Available' },
    { value: '0', label: '2D Image Only' },
];

const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: '-base_price', label: 'Price (High to Low)' },
    { value: 'base_price', label: 'Price (Low to High)' },
    { value: '-stock_quantity', label: 'Stock (High to Low)' },
];

export default function ProductsIndex({
    products = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated,
    filters = {},
    stats = { total: 0, active: 0, customizable: 0 },
}: {
    products?: Paginated;
    filters?: Record<string, any>;
    stats?: { total: number; active: number; customizable: number };
}) {
    const pageProps = usePage().props as unknown as {
        flash?: { success?: string };
    };
    const flash = pageProps.flash ?? {};
    const rows = products?.data ?? [];

    const safeFilters = filters || {};
    const rawFilter = (safeFilters.filter && typeof safeFilters.filter === 'object' ? safeFilters.filter : {}) as Record<string, string>;

    const [search, setSearch] = useState<string>(rawFilter.name ?? rawFilter.sku ?? '');
    const [status, setStatus] = useState<string>(rawFilter.status ?? 'all');
    const [category, setCategory] = useState<string>(rawFilter.category ?? 'all');
    const [isCustomizable, setIsCustomizable] = useState<string>(rawFilter.is_customizable ?? 'all');
    const [has3dPreview, setHas3dPreview] = useState<string>(rawFilter.has_3d_preview ?? 'all');
    const [sort, setSort] = useState<string>(typeof safeFilters.sort === 'string' ? safeFilters.sort : '-created_at');
    const [perPage, setPerPage] = useState<string>(String(safeFilters.per_page ?? 10));

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [viewId, setViewId] = useState<number | null>(null);
    const [archiving, setArchiving] = useState(false);

    const viewing = rows.find((p) => p.id === viewId) ?? null;

    const closeView = () => setViewId(null);

    const handleFilterChange = (updates: Record<string, string>) => {
        const nextFilter: Record<string, string> = {
            name: updates.search ?? search,
            status: (updates.status ?? status) === 'all' ? '' : (updates.status ?? status),
            category: (updates.category ?? category) === 'all' ? '' : (updates.category ?? category),
            is_customizable: (updates.is_customizable ?? isCustomizable) === 'all' ? '' : (updates.is_customizable ?? isCustomizable),
            has_3d_preview: (updates.has_3d_preview ?? has3dPreview) === 'all' ? '' : (updates.has_3d_preview ?? has3dPreview),
        };

        // Clean empty values
        Object.keys(nextFilter).forEach((k) => {
            if (!nextFilter[k]) delete nextFilter[k];
        });

        router.get(
            '/products',
            {
                filter: nextFilter,
                sort: updates.sort ?? sort,
                per_page: updates.per_page ?? perPage,
            } as never,
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setCategory('all');
        setIsCustomizable('all');
        setHas3dPreview('all');
        setSort('-created_at');
        router.get('/products', {}, { preserveState: true, replace: true });
    };

    const archiveViewed = () => {
        if (!viewing) return;
        if (!confirm(`Archive ${viewing.name}?`)) return;
        setArchiving(true);
        router.delete(`/products/${viewing.id}`, {
            onFinish: () => {
                setArchiving(false);
                setViewId(null);
                router.reload({ only: ['products', 'stats'] });
            },
        });
    };

    const exportCsv = () => {
        const headers = ['ID', 'SKU', 'Name', 'Category', 'Status', 'Price', 'Stock', 'Customizable', '3D Preview'];
        const csvRows = rows.map((p) => [
            p.id,
            p.sku,
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.category || ''}"`,
            p.status,
            p.base_price,
            p.stock_quantity,
            p.is_customizable ? 'Yes' : 'No',
            p.has_3d_preview ? 'Yes' : 'No',
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `products_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const statusColor = (s: string) =>
        s === 'active' ? 'bg-emerald-500' : s === 'archived' ? 'bg-gray-400' : s === 'draft' ? 'bg-amber-400' : 'bg-red-500';

    return (
        <>
            <Head title="Products" />

            <div className="flex flex-col gap-3 font-sans text-[#1A1C1E]">
                {flash.success && (
                    <div className="flex items-center gap-2 rounded-none border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-mono text-emerald-800">
                        <CheckCircle2 size={15} className="text-emerald-600" /> {flash.success}
                    </div>
                )}

                {/* HEADING SECTION */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
                    <div className="max-w-[640px]">
                        <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                            Products <span className="font-mono text-xs font-normal text-muted-foreground">({(products?.total ?? 0).toLocaleString()})</span>
                        </h1>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Easily manage product catalog inventory, pricing rules, categories, and 3D preview controls for retail and custom print fulfillment.
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
                        <Link href="/products/create">
                            <Button size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white hover:bg-black">
                                <Plus size={12} className="mr-1" /> Add Product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-xs">
                    <button
                        type="button"
                        onClick={resetFilters}
                        className={`pb-1 ${status === 'all' && isCustomizable === 'all' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        All Products ({(products?.total ?? 0).toLocaleString()})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setStatus('active');
                            handleFilterChange({ status: 'active' });
                        }}
                        className={`pb-1 ${status === 'active' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        Active Catalog ({stats.active})
                    </button>
                </div>

                {/* HEAVY DETAILED LINEAR FILTER TOOLBAR */}
                <div className="rounded-none border border-[#E5E7EB] bg-white p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                            {/* SEARCH INPUT */}
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[#8A8FA3]" />
                                <Input
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        handleFilterChange({ search: e.target.value });
                                    }}
                                    placeholder="Search product name or SKU..."
                                    className="h-8 rounded-none border-[#D1D5DB] pl-8 text-xs placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0"
                                />
                            </div>

                            {/* CATEGORY SELECT */}
                            <Select
                                value={category}
                                onValueChange={(v) => {
                                    setCategory(v);
                                    handleFilterChange({ category: v });
                                }}
                            >
                                <SelectTrigger className="h-8 w-[150px] rounded-none border-[#D1D5DB] text-xs font-mono">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    {CATEGORY_OPTIONS.map((c) => (
                                        <SelectItem key={c.value} value={c.value} className="text-xs">
                                            {c.label}
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
                                <SelectTrigger className="h-8 w-[130px] rounded-none border-[#D1D5DB] text-xs font-mono">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    {STATUS_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value} className="text-xs">
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* MORE FILTERS BUTTON */}
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className={`h-8 rounded-none border-[#D1D5DB] px-2.5 text-xs font-mono ${
                                    showAdvanced || isCustomizable !== 'all' || has3dPreview !== 'all' ? 'bg-[#F3F4F6] font-bold text-[#1A1C1E]' : 'text-[#4A4E5A]'
                                }`}
                            >
                                <SlidersHorizontal size={12} className="mr-1.5" />
                                Detailed Filters
                            </Button>

                            {(search || status !== 'all' || category !== 'all' || isCustomizable !== 'all' || has3dPreview !== 'all') && (
                                <Button
                                    variant="ghost"
                                    onClick={resetFilters}
                                    className="h-8 rounded-none px-2 text-xs font-mono text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <RotateCcw size={12} className="mr-1" />
                                    Reset
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* SORT BY SELECT */}
                            <Select
                                value={sort}
                                onValueChange={(v) => {
                                    setSort(v);
                                    handleFilterChange({ sort: v });
                                }}
                            >
                                <SelectTrigger className="h-8 w-[160px] rounded-none border-[#D1D5DB] text-xs font-mono">
                                    <ArrowUpDown size={12} className="mr-1" />
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
                        </div>
                    </div>

                    {/* EXPANDABLE ADVANCED FILTER PANEL */}
                    {showAdvanced && (
                        <div className="mt-2 border-t border-[#E5E7EB] pt-2 grid gap-2 sm:grid-cols-3 font-mono text-xs">
                            <div>
                                <p className="mb-1 text-[10px] text-[#4A4E5A]">Customization Capability</p>
                                <Select
                                    value={isCustomizable}
                                    onValueChange={(v) => {
                                        setIsCustomizable(v);
                                        handleFilterChange({ is_customizable: v });
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-full rounded-none border-[#D1D5DB] text-xs">
                                        <SelectValue placeholder="Customization" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {CUSTOMIZABLE_OPTIONS.map((co) => (
                                            <SelectItem key={co.value} value={co.value} className="text-xs">
                                                {co.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <p className="mb-1 text-[10px] text-[#4A4E5A]">3D Preview Capability</p>
                                <Select
                                    value={has3dPreview}
                                    onValueChange={(v) => {
                                        setHas3dPreview(v);
                                        handleFilterChange({ has_3d_preview: v });
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-full rounded-none border-[#D1D5DB] text-xs">
                                        <SelectValue placeholder="3D Preview" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {PREVIEW_3D_OPTIONS.map((po) => (
                                            <SelectItem key={po.value} value={po.value} className="text-xs">
                                                {po.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <p className="mb-1 text-[10px] text-[#4A4E5A]">Items Per Page</p>
                                <Select
                                    value={perPage}
                                    onValueChange={(v) => {
                                        setPerPage(v);
                                        handleFilterChange({ per_page: v });
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-full rounded-none border-[#D1D5DB] text-xs">
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

                {/* PRODUCT CARDS GRID */}
                {rows.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {rows.map((p) => (
                            <div key={p.id} className="rounded-none border border-[#E5E7EB] bg-white p-2">
                                <div className="relative">
                                    <span
                                        title={p.status}
                                        className={`pointer-events-none absolute top-2 right-2 z-10 h-2.5 w-2.5 rounded-full ${statusColor(p.status)}`}
                                    />
                                    {p.has_3d_preview && p.viewer_type !== 'none' ? (
                                        <Product3DPreview
                                            viewerType={p.viewer_type}
                                            label={p.name}
                                            modelUrl={p.model_3d_url ?? ''}
                                            designImageUrl={p.thumbnail ?? ''}
                                            minimal
                                            onPreviewClick={() => setViewId(p.id)}
                                        />
                                    ) : p.thumbnail ? (
                                        <button
                                            type="button"
                                            onClick={() => setViewId(p.id)}
                                            aria-label={`View ${p.name}`}
                                            className="block w-full cursor-pointer"
                                        >
                                            <img src={p.thumbnail} alt={p.name} className="h-[220px] w-full bg-gray-50 object-cover rounded-none" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setViewId(p.id)}
                                            aria-label={`View ${p.name}`}
                                            className="flex h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-2 bg-gray-50 rounded-none border border-dashed border-[#D1D5DB]"
                                        >
                                            <span className="flex h-10 w-10 items-center justify-center rounded-none bg-white border border-[#E5E7EB]">
                                                <Package size={18} className="text-[#6B7280]" />
                                            </span>
                                            <p className="text-[11px] font-mono text-[#6B7280]">2D product — no 3D preview</p>
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1 px-1 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setViewId(p.id)}
                                        className="block w-full truncate text-left text-[12px] font-semibold text-[#1A1C1E] hover:underline"
                                    >
                                        {p.name}
                                    </button>
                                    <div className="flex items-center justify-between font-mono text-[11px]">
                                        <span className="font-bold text-[#1A1C1E]">₱{p.base_price}</span>
                                        <span className="text-[#6B7280]">Stock {p.stock_quantity}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] text-[10px] font-mono text-[#6B7280]">
                                        <span>{p.category || 'General'}</span>
                                        <span>{p.sku}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-none border border-[#E5E7EB] bg-white p-8 text-center font-mono text-xs text-[#8A8FA3]">
                        No products match the selected criteria.
                    </div>
                )}

                {/* PAGINATION FOOTER */}
                {products && products.last_page > 1 && (
                    <div className="mt-2 flex items-center justify-between border-t border-[#E5E7EB] pt-2.5 font-mono text-xs text-[#6B7280]">
                        <div>
                            Showing <strong>{products.from ?? 0}</strong> to <strong>{products.to ?? 0}</strong> of <strong>{products.total}</strong> products
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={products.current_page <= 1}
                                onClick={() => router.get('/products', { ...safeFilters, page: products.current_page - 1 } as never)}
                                className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                            >
                                <ChevronLeft size={13} className="mr-1" /> Prev
                            </Button>
                            <span className="px-2 font-bold text-[#1A1C1E]">
                                Page {products.current_page} of {products.last_page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={products.current_page >= products.last_page}
                                onClick={() => router.get('/products', { ...safeFilters, page: products.current_page + 1 } as never)}
                                className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                            >
                                Next <ChevronRight size={13} className="ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* QUICK DETAIL MODAL */}
                {viewing && (
                    <Dialog open={!!viewing} onOpenChange={closeView}>
                        <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="font-mono text-base text-[#1A1C1E] flex items-center justify-between">
                                    <span>{viewing.name}</span>
                                    <span className="text-xs font-normal text-muted-foreground">[{viewing.sku}]</span>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-3 font-sans text-xs">
                                <div className="grid grid-cols-2 gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-[11px]">
                                    <div>
                                        <span className="text-[#6B7280]">Category:</span>{' '}
                                        <strong className="text-[#1A1C1E]">{viewing.category || 'General'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[#6B7280]">Status:</span>{' '}
                                        <strong className="uppercase text-[#1A1C1E]">{viewing.status}</strong>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#4A4E5A]">Description</h4>
                                    <p className="mt-0.5 text-xs text-[#374151] leading-relaxed">
                                        {viewing.description || viewing.short_description || 'No detailed description provided.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-b border-[#E5E7EB] py-2 font-mono text-[11px]">
                                    <div>
                                        <p className="text-[#6B7280]">Price:</p>
                                        <p className="font-bold text-[#1A1C1E]">₱{viewing.base_price}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#6B7280]">Inventory Stock:</p>
                                        <p className="font-bold text-[#1A1C1E]">{viewing.stock_quantity} units</p>
                                    </div>
                                    <div>
                                        <p className="text-[#6B7280]">3D Preview:</p>
                                        <p className="font-semibold text-[#1A1C1E]">{viewing.has_3d_preview ? 'Enabled' : 'Disabled'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#6B7280]">Customizable:</p>
                                        <p className="font-semibold text-[#1A1C1E]">{viewing.is_customizable ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-2 border-t border-[#E5E7EB] pt-2">
                                <Link href={`/products/${viewing.id}/edit`}>
                                    <Button className="h-8 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                        Edit Product
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={archiveViewed}
                                    disabled={archiving}
                                    className="h-8 rounded-none border-red-300 text-xs font-normal text-red-700 hover:bg-red-50"
                                >
                                    Archive Product
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={closeView}
                                    className="h-8 rounded-none border-[#D1D5DB] text-xs font-normal text-[#1A1C1E]"
                                >
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

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Products',
            href: '/products',
        },
    ],
};
