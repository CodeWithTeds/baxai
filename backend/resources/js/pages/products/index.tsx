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
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
            </span>
        ) : s === 'archived' ? (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-gray-400" /> Archived
            </span>
        ) : (
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
                <span className="h-2 w-2 rounded-full bg-red-500" /> {s}
            </span>
        );

    return (
        <>
            <Head title="Products" />

            <div className="flex flex-col gap-4">
                {flash.success && (
                    <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
                        <CheckCircle2 size={16} className="text-emerald-600" /> {flash.success}
                    </div>
                )}

                {/* page heading */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Package size={18} />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Products{' '}
                            <span className="font-normal text-muted-foreground">
                                ({(products?.total ?? 0).toLocaleString()})
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your product catalog, pricing, and 3D previews
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Link href="/products/create">
                            <Button>
                                <Plus size={14} /> Add new product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* filter row */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyFilters();
                            }}
                            placeholder="Search name or SKU..."
                            className="w-64 pl-9"
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-40">
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
                    <Button onClick={applyFilters}>Filter</Button>
                </div>

                {/* bulk bar */}
                {selected.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{selected.length} selected</span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={processing}
                            onClick={() => bulk('bulk-activate')}
                        >
                            Activate all
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={processing}
                            onClick={() => bulk('bulk-archive')}
                        >
                            <Archive size={14} /> Archive all
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={processing}
                            onClick={() => bulk('bulk-destroy')}
                            className="text-red-600 hover:text-red-700"
                        >
                            <Trash2 size={14} /> Delete all
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                            Clear
                        </Button>
                    </div>
                )}

                {/* table */}
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="overflow-x-auto px-5">
                        <table className="w-full min-w-[1150px] text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="w-10 py-3 pr-4">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleAll}
                                        />
                                    </th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Product</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Category</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Status</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Price</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Stock</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Customize</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">3D Viewer</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Badge</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Featured</th>
                                    <th className="px-2 py-3 font-medium text-muted-foreground">Updated</th>
                                    <th className="w-10 py-3 pl-4" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) => (
                                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-3 pr-4">
                                            <Checkbox
                                                checked={selected.includes(p.id)}
                                                onCheckedChange={() => toggleOne(p.id)}
                                            />
                                        </td>
                                        <td className="px-2 py-3">
                                            <div className="flex items-center gap-2.5">
                                                {p.thumbnail ? (
                                                    <img
                                                        src={p.thumbnail}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                        <Box size={15} />
                                                    </span>
                                                )}
                                                <div>
                                                    <p className="text-[13px] font-semibold">{p.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{p.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3">
                                            <Badge variant="secondary">{p.category}</Badge>
                                        </td>
                                        <td className="px-2 py-3">{statusDot(p.status)}</td>
                                        <td className="px-2 py-3 font-semibold">₱{p.base_price}</td>
                                        <td className="px-2 py-3">{p.stock_quantity}</td>
                                        <td className="px-2 py-3">
                                            {p.is_customizable ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-muted-foreground">No</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-3">
                                            {p.has_3d_preview ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                                    <Cuboid size={12} />
                                                    {p.viewer_type}
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-3">
                                            {p.badge ? (
                                                <Badge variant="secondary">{p.badge}</Badge>
                                            ) : (
                                                <span className="text-[12px] text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-3">
                                            <span className="flex items-center gap-1 text-[11px] font-semibold">
                                                {p.is_featured_home && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                                        Home
                                                    </span>
                                                )}
                                                {p.is_featured_services && (
                                                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                                                        Services
                                                    </span>
                                                )}
                                                {!p.is_featured_home && !p.is_featured_services && (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-[12px] text-muted-foreground">
                                            {new Date(p.updated_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 pl-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="rounded-md px-1.5 py-1 font-bold text-muted-foreground hover:bg-muted">
                                                        <MoreHorizontal size={16} />
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
                                                            if (confirm(`Archive ${p.name}?`))
                                                                router.delete(`/products/${p.id}`);
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
                                        <td colSpan={12} className="px-4 py-16 text-center">
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                <Package size={20} className="text-muted-foreground" />
                                            </div>
                                            <p className="mt-3 text-sm font-medium">No products found</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Try a different search, or create your first product.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* footer */}
                    <div className="flex flex-wrap items-center gap-3 border-t px-5 py-3 text-[12px] text-muted-foreground">
                        <span>Rows per page</span>
                        <Select
                            value={String(products?.per_page ?? 10)}
                            onValueChange={(v) =>
                                router.get('/products', { ...(filters ?? {}), per_page: v }, { preserveState: true })
                            }
                        >
                            <SelectTrigger className="h-8 w-[70px]">
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
                                disabled={(products?.current_page ?? 1) <= 1}
                                onClick={() =>
                                    router.get('/products', {
                                        ...(filters ?? {}),
                                        page: (products?.current_page ?? 1) - 1,
                                    })
                                }
                            >
                                <ChevronLeft size={14} />
                            </Button>
                            <span className="px-2 font-semibold text-foreground">
                                {products?.current_page ?? 1} / {products?.last_page ?? 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={(products?.current_page ?? 1) >= (products?.last_page ?? 1)}
                                onClick={() =>
                                    router.get('/products', {
                                        ...(filters ?? {}),
                                        page: (products?.current_page ?? 1) + 1,
                                    })
                                }
                            >
                                <ChevronRight size={14} />
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
