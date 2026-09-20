import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Archive,
    Box,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Cuboid,
    Eye,
    MoreHorizontal,
    Package,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { dashboard } from '@/routes';

interface ProductRow {
    id: number;
    name: string;
    sku: string;
    category: string;
    status: string;
    badge: string | null;
    base_price: string;
    stock_quantity: number;
    thumbnail: string | null;
    is_customizable: boolean;
    has_3d_preview: boolean;
    viewer_type: string;
    is_featured_home: boolean;
    is_featured_services: boolean;
    updated_at: string;
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
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
];

export default function ProductsIndex({
    products = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated,
    filters = {},
    stats = { total: 0, active: 0, customizable: 0 },
}: {
    products?: Paginated;
    filters?: Record<string, unknown>;
    stats?: { total: number; active: number; customizable: number };
}) {
    const pageProps = usePage().props as unknown as {
        flash?: { success?: string };
    };
    const flash = pageProps.flash ?? {};
    const rows = products?.data ?? [];
    const initialFilter = (filters?.filter ?? {}) as { name?: string; status?: string };
    const [search, setSearch] = useState(initialFilter.name ?? '');
    const [status, setStatus] = useState(initialFilter.status ?? 'all');
    const [selected, setSelected] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);

    const allSelected =
        rows.length > 0 && selected.length === rows.length;

    const toggleAll = () => {
        setSelected(allSelected ? [] : rows.map((p) => p.id));
    };

    const toggleOne = (id: number) => {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id],
        );
    };

    const applyFilters = () => {
        const filter: Record<string, string> = {};
        if (search.trim()) {
            filter.name = search.trim();
        }
        if (status !== 'all') {
            filter.status = status;
        }
        router.get(
            '/products',
            { filter, per_page: products?.per_page ?? 10 },
            { preserveState: true },
        );
    };

    const bulk = (action: 'bulk-activate' | 'bulk-archive' | 'bulk-destroy') => {
        if (selected.length === 0) return;
        if (!confirm(`Apply ${action} to ${selected.length} products?`)) return;
        setProcessing(true);
        router.post(
            `/products/${action}`,
            { ids: selected },
            {
                onFinish: () => {
                    setProcessing(false);
                    setSelected([]);
                    router.reload({ only: ['products', 'stats'] });
                },
            },
        );
    };

    const statusDot = (s: string) =>
        s === 'active' ? (
            <span className="flex items-center gap-1.5 text-xs font-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
        ) : s === 'archived' ? (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Archived
            </span>
        ) : (
            <span className="flex items-center gap-1.5 text-xs font-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {s}
            </span>
        );

    return (
        <>
            <Head title="Products" />

            <div className="flex flex-col gap-3">
                {flash.success && (
                    <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
                        <CheckCircle2 size={16} className="text-emerald-600" /> {flash.success}
                    </div>
                )}

                {/* page heading — Mailgun-style with top text */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-[640px]">
                        <h1 className="text-[16px] font-normal tracking-tight text-[#1A1C1E]">
                            Products <span className="text-muted-foreground">({(products?.total ?? 0).toLocaleString()})</span>
                        </h1>
                        <p className="mt-1 max-w-[560px] text-[12px] leading-relaxed text-[#6B7280]">
                            Easily manage your product catalog through centralized inventory, pricing and 3D preview controls. Track stock, organize by category and enable immersive previews for better targeting and improved shopping experience.
                        </p>
                    </div>
                    <div className="ml-auto shrink-0">
                        <Link href="/products/create">
                            <Button size="sm" className="h-8 px-3 text-xs font-normal">
                                <Plus size={13} /> Add new product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* filter row — compressed */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="relative">
                        <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyFilters();
                            }}
                            placeholder="Search name or SKU..."
                            className="h-7 w-52 pl-8 text-xs"
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={applyFilters} size="sm" className="h-7 px-3 text-xs font-normal">
                        Filter
                    </Button>
                </div>

                {/* bulk bar — compressed */}
                {selected.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-normal">{selected.length} selected</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs font-normal" disabled={processing} onClick={() => bulk('bulk-activate')}>
                            Activate all
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs font-normal" disabled={processing} onClick={() => bulk('bulk-archive')}>
                            <Archive size={12} /> Archive all
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal text-red-600 hover:text-red-700"
                            disabled={processing}
                            onClick={() => bulk('bulk-destroy')}
                        >
                            <Trash2 size={12} /> Delete all
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs font-normal" onClick={() => setSelected([])}>
                            Clear
                        </Button>
                    </div>
                )}

                {/* table — Mailgun-style light border */}
                <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                    <div className="overflow-x-auto px-3">
                        <table className="w-full min-w-[1280px] text-left text-xs">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] bg-white">
                                    <th className="w-8 py-2 pr-2">
                                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                                    </th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">#</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Product</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">SKU</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Category</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Status</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Price</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Stock</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Customize</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">3D</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Badge</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Featured</th>
                                    <th className="px-1.5 py-2 font-normal text-muted-foreground">Updated</th>
                                    <th className="w-8 py-2 pl-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) => (
                                    <tr key={p.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                                        <td className="py-1.5 pr-2">
                                            <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleOne(p.id)} />
                                        </td>
                                        <td className="px-1.5 py-1.5 text-[11px] text-muted-foreground">{p.id}</td>
                                        <td className="px-1.5 py-1.5">
                                            <div className="flex items-center gap-2">
                                                {p.thumbnail ? (
                                                    <img src={p.thumbnail} alt="" className="h-6 w-6 rounded-full object-cover" />
                                                ) : (
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                        <Box size={12} />
                                                    </span>
                                                )}
                                                <span className="max-w-[160px] truncate text-xs font-normal">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-1.5 py-1.5 font-mono text-[11px] font-normal text-muted-foreground">{p.sku}</td>
                                        <td className="px-1.5 py-1.5">
                                            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                                                {p.category}
                                            </Badge>
                                        </td>
                                        <td className="px-1.5 py-1.5">{statusDot(p.status)}</td>
                                        <td className="px-1.5 py-1.5 font-normal">₱{p.base_price}</td>
                                        <td className="px-1.5 py-1.5 font-normal">{p.stock_quantity}</td>
                                        <td className="px-1.5 py-1.5">
                                            {p.is_customizable ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-normal text-emerald-700">Yes</span>
                                            ) : (
                                                <span className="text-[11px] font-normal text-muted-foreground">No</span>
                                            )}
                                        </td>
                                        <td className="px-1.5 py-1.5">
                                            {p.has_3d_preview ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[11px] font-normal text-blue-700">
                                                    <Cuboid size={10} />
                                                    {p.viewer_type}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-normal text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-1.5 py-1.5">
                                            {p.badge ? (
                                                <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                                                    {p.badge}
                                                </Badge>
                                            ) : (
                                                <span className="text-[11px] font-normal text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-1.5 py-1.5">
                                            <span className="flex items-center gap-1 text-[11px] font-normal">
                                                {p.is_featured_home && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700">Home</span>}
                                                {p.is_featured_services && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-violet-700">Services</span>}
                                                {!p.is_featured_home && !p.is_featured_services && <span className="text-muted-foreground">—</span>}
                                            </span>
                                        </td>
                                        <td className="px-1.5 py-1.5 text-[11px] font-normal text-muted-foreground">
                                            {new Date(p.updated_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-1.5 pl-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="rounded-md px-1 py-0.5 text-muted-foreground hover:bg-muted">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/products/${p.id}`}>
                                                            <Eye size={14} /> View
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/products/${p.id}/edit`}>
                                                            <Pencil size={14} /> Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => {
                                                            if (confirm(`Archive ${p.name}?`)) router.delete(`/products/${p.id}`);
                                                        }}
                                                    >
                                                        <Trash2 size={14} /> Archive
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={14} className="px-4 py-12 text-center">
                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                <Package size={18} className="text-muted-foreground" />
                                            </div>
                                            <p className="mt-2 text-xs font-normal">No products found</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Try a different search, or create your first product.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* footer — compressed */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] bg-white px-3 py-2 text-[11px] font-normal text-muted-foreground">
                        <span>Rows per page</span>
                        <Select
                            value={String(products?.per_page ?? 10)}
                            onValueChange={(v) => router.get('/products', { ...(filters ?? {}), per_page: v }, { preserveState: true })}
                        >
                            <SelectTrigger className="h-7 w-[64px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <span>
                            {products?.from ?? 0}-{products?.to ?? 0} of {products?.total ?? 0}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={(products?.current_page ?? 1) <= 1}
                                onClick={() => router.get('/products', { ...(filters ?? {}), page: (products?.current_page ?? 1) - 1 })}
                            >
                                <ChevronLeft size={13} />
                            </Button>
                            <span className="px-1.5 text-xs font-normal text-foreground">
                                {products?.current_page ?? 1} / {products?.last_page ?? 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={(products?.current_page ?? 1) >= (products?.last_page ?? 1)}
                                onClick={() => router.get('/products', { ...(filters ?? {}), page: (products?.current_page ?? 1) + 1 })}
                            >
                                <ChevronRight size={13} />
                            </Button>
                        </div>
                    </div>
                </div>
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
