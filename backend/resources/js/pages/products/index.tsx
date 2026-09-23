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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Package,
    Plus,
    Search,
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
    max_text_length: number | null;
    allow_image_upload: boolean;
    print_method: string | null;
    print_size: string | null;
    customization_addon_price: string | null;
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
    const [viewId, setViewId] = useState<number | null>(null);
    const [archiving, setArchiving] = useState(false);
    const viewing = rows.find((p) => p.id === viewId) ?? null;

    const closeView = () => setViewId(null);

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

    const statusColor = (s: string) =>
        s === 'active' ? 'bg-emerald-500' : s === 'archived' ? 'bg-gray-400' : s === 'draft' ? 'bg-amber-400' : 'bg-red-500';

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

                {/* cards — 4 per row, live 3D model on every card */}
                {rows.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {rows.map((p) => (
                            <div key={p.id}>
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
                                            <img src={p.thumbnail} alt={p.name} className="h-[220px] w-full bg-gray-50 object-cover" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setViewId(p.id)}
                                            aria-label={`View ${p.name}`}
                                            className="flex h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-2 bg-transparent"
                                        >
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                                                <Package size={18} className="text-[#6B7280]" />
                                            </span>
                                            <p className="text-[11px] font-normal text-[#6B7280]">2D product — no 3D preview</p>
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1 px-1 pt-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setViewId(p.id)}
                                        className="block w-full truncate text-center text-[13px] font-normal hover:underline"
                                    >
                                        {p.name}
                                    </button>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-[13px] font-normal">₱{p.base_price}</span>
                                        <span className="text-[11px] font-normal text-muted-foreground">Stock {p.stock_quantity}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-12 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Package size={18} className="text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-xs font-normal">No products found</p>
                        <p className="mt-1 text-xs text-muted-foreground">Try a different search, or create your first product.</p>
                    </div>
                )}

                {/* quick-view modal — same two-column layout as create, 3D on the right */}
                <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) closeView(); }}>
                    <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-[95vw] md:left-[calc(50%+104px)] md:max-w-[min(1380px,calc(95vw-240px))]">
                        {viewing && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-[#1A1C1E]">
                                        {viewing.name}
                                        <span className={`h-2 w-2 rounded-full ${statusColor(viewing.status)}`} title={viewing.status} />
                                        <span className="text-[11px] font-normal text-[#6B7280]">{viewing.category} · {viewing.status}</span>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="grid items-start gap-3 xl:grid-cols-2">
                                    {/* LEFT — basic + pricing */}
                                    <div className="space-y-3">
                                        <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                            <h3 className="mb-3 border-b border-[#E5E7EB] pb-2 text-[12px] font-normal tracking-wide text-[#1A1C1E]">Basic info</h3>
                                            <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
                                                <div><dt className="text-[#8A8FA3]">Name</dt><dd className="font-normal text-[#1A1C1E]">{viewing.name}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">SKU</dt><dd className="font-mono text-[11px] font-normal text-[#1A1C1E]">{viewing.sku}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Category</dt><dd className="font-normal text-[#1A1C1E]">{viewing.category}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Status</dt><dd className="font-normal text-[#1A1C1E]">{viewing.status}</dd></div>
                                                <div className="sm:col-span-2"><dt className="text-[#8A8FA3]">Short description</dt><dd className="font-normal text-[#1A1C1E]">{viewing.short_description || '—'}</dd></div>
                                                <div className="sm:col-span-2"><dt className="text-[#8A8FA3]">Description</dt><dd className="font-normal leading-relaxed text-[#1A1C1E]">{viewing.description || '—'}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                            <h3 className="mb-3 border-b border-[#E5E7EB] pb-2 text-[12px] font-normal tracking-wide text-[#1A1C1E]">Pricing & inventory</h3>
                                            <dl className="grid gap-2 text-[12px] sm:grid-cols-3">
                                                <div><dt className="text-[#8A8FA3]">Base ₱</dt><dd className="font-normal text-[#1A1C1E]">{viewing.base_price}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Compare ₱</dt><dd className="font-normal text-[#1A1C1E]">{viewing.compare_at_price ?? '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Unit</dt><dd className="font-normal text-[#1A1C1E]">{viewing.unit ?? 'piece'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Stock</dt><dd className="font-normal text-[#1A1C1E]">{viewing.stock_quantity}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Badge</dt><dd className="font-normal text-[#1A1C1E]">{viewing.badge || '—'}</dd></div>
                                            </dl>
                                        </section>
                                    </div>

                                    {/* RIGHT — 3D preview + options */}
                                    <div className="space-y-3">
                                        <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                            <h3 className="mb-3 border-b border-[#E5E7EB] pb-2 text-[12px] font-normal tracking-wide text-[#1A1C1E]">3D preview</h3>
                                            {viewing.has_3d_preview && viewing.viewer_type !== 'none' ? (
                                                <Product3DPreview
                                                    viewerType={viewing.viewer_type}
                                                    label={viewing.name}
                                                    modelUrl={viewing.model_3d_url ?? ''}
                                                    designImageUrl={viewing.thumbnail ?? ''}
                                                />
                                            ) : viewing.thumbnail ? (
                                                <img src={viewing.thumbnail} alt={viewing.name} className="max-h-64 w-full rounded-lg border border-[#E5E7EB] bg-gray-50 object-contain" />
                                            ) : (
                                                <p className="text-[12px] font-normal text-[#8A8FA3]">2D product — no 3D preview.</p>
                                            )}
                                        </section>

                                        <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                            <h3 className="mb-3 border-b border-[#E5E7EB] pb-2 text-[12px] font-normal tracking-wide text-[#1A1C1E]">Customizable & 3D</h3>
                                            <dl className="grid grid-cols-2 gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Customizable</dt><dd className="font-normal text-[#1A1C1E]">{viewing.is_customizable ? 'Yes' : 'No'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">3D preview</dt><dd className="font-normal text-[#1A1C1E]">{viewing.has_3d_preview ? `Yes (${viewing.viewer_type})` : 'No'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Color choices</dt><dd className="font-normal text-[#1A1C1E]">{viewing.allow_color_change ? 'Yes' : 'No'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Custom text</dt><dd className="font-normal text-[#1A1C1E]">{viewing.allow_custom_text ? `Yes (${viewing.max_text_length ?? ''})` : 'No'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Image upload</dt><dd className="font-normal text-[#1A1C1E]">{viewing.allow_image_upload ? 'Yes' : 'No'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Add-on ₱</dt><dd className="font-normal text-[#1A1C1E]">{viewing.customization_addon_price ?? '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Print</dt><dd className="font-normal text-[#1A1C1E]">{[viewing.print_method, viewing.print_size].filter(Boolean).join(' · ') || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Featured</dt><dd className="font-normal text-[#1A1C1E]">{[viewing.is_featured_home && 'Home', viewing.is_featured_services && 'Services'].filter(Boolean).join(', ') || 'No'}</dd></div>
                                            </dl>
                                            {viewing.allow_color_change && (viewing.available_colors?.length ?? 0) > 0 && (
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    {(viewing.available_colors ?? []).map((c) => (
                                                        <span key={c} title={c} className="h-5 w-5 rounded-full border border-[#E5E7EB]" style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2">
                                    <Button variant="ghost" type="button" onClick={closeView}>
                                        Close
                                    </Button>
                                    <Button variant="outline" type="button" className="text-red-600" disabled={archiving} onClick={archiveViewed}>
                                        {archiving ? 'Archiving…' : 'Archive'}
                                    </Button>
                                    <Link href={`/products/${viewing.id}/edit`}>
                                        <Button type="button">Edit</Button>
                                    </Link>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                    {/* footer — compressed */}
                    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-normal text-muted-foreground">
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
