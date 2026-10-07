import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

interface PrintItemDetail {
    id: number;
    name: string;
    item_code: string;
    category_id: number;
    category?: { id: number; name: string; code: string } | null;
    description: string | null;
    paper_type: string | null;
    paper_size: string | null;
    brand: string | null;
    model: string | null;
    available_quantity: number;
    unit: string | null;
    compatibility: string | null;
    print_sides: string;
    color_mode: string;
    turnaround_time: string;
    base_price: string | number;
    min_quantity: number;
    status: string;
    notes: string | null;
    image_url?: string | null;
    created_at: string;
    updated_at: string;
}

export default function ShowPrintItem({ item }: { item: PrintItemDetail }) {
    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete ${item.name}?`)) {
            router.delete(`/print-items/${item.id}`);
        }
    };

    const prettySides = (val: string) => {
        if (val === 'single_sided') return 'Single-Sided (1S)';
        if (val === 'double_sided') return 'Double-Sided (2S)';
        return 'Variable / Custom';
    };

    const prettyColor = (val: string) => {
        if (val === 'full_color') return 'Full Color (CMYK)';
        if (val === 'monochrome') return 'Monochrome (B&W)';
        return 'Grayscale';
    };

    return (
        <div className="font-sans text-[#1A1C1E]">
            <Head title={`Printing Service — ${item.name}`} />

            {/* HEADER */}
            <div className="mb-4 border-b border-[#E5E7EB] pb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Link href="/print-items">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-[#D1D5DB] bg-white">
                            <ArrowLeft size={14} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-[#1A1C1E]">{item.name}</h1>
                            <span className="font-mono text-xs font-normal text-muted-foreground">[{item.item_code}]</span>
                            <span className="rounded-none border border-[#D1D5DB] bg-white px-2 py-0.5 font-mono text-[10px] uppercase text-[#374151]">
                                {item.status}
                            </span>
                        </div>
                        <p className="text-xs text-[#6B7280]">
                            Category: <strong className="text-[#1A1C1E]">{item.category?.name ?? 'General'}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href={`/print-items/${item.id}/edit`}>
                        <Button className="h-8 rounded-none bg-[#1A1C1E] px-3 text-xs font-normal text-white hover:bg-black">
                            <Edit size={13} className="mr-1.5" />
                            Edit Resource
                        </Button>
                    </Link>
                    <Button variant="destructive" onClick={handleDelete} className="h-8 rounded-none px-3 text-xs font-normal">
                        <Trash2 size={13} className="mr-1.5" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* DETAILED BOX CONTENT */}
            <div className="grid gap-3 xl:grid-cols-3">
                <div className="xl:col-span-2 space-y-3">
                    {item.image_url && (
                        <section className="rounded-none border border-[#E5E7EB] bg-white p-4 flex justify-center">
                            <img src={item.image_url} alt={item.name} className="max-h-64 object-contain border border-[#E5E7EB] p-1" />
                        </section>
                    )}

                    <section className="rounded-none border border-[#E5E7EB] bg-white p-4">
                        <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-[#1A1C1E] border-b border-[#E5E7EB] pb-1">
                            Resource Description
                        </h3>
                        <p className="text-xs text-[#374151] leading-relaxed">
                            {item.description || 'No description provided.'}
                        </p>
                    </section>

                    <section className="rounded-none border border-[#E5E7EB] bg-white p-4">
                        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-[#1A1C1E] border-b border-[#E5E7EB] pb-1">
                            Printing Specifications & Stock Info
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 font-mono text-xs">
                            {item.brand && (
                                <div className="border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                    <span className="block text-[10px] text-[#6B7280] uppercase">Brand</span>
                                    <strong className="text-[#1A1C1E]">{item.brand}</strong>
                                </div>
                            )}
                            {item.model && (
                                <div className="border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                    <span className="block text-[10px] text-[#6B7280] uppercase">Model / Part No.</span>
                                    <strong className="text-[#1A1C1E]">{item.model}</strong>
                                </div>
                            )}
                            <div className="border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                <span className="block text-[10px] text-[#6B7280] uppercase">Paper Stock</span>
                                <strong className="text-[#1A1C1E]">{item.paper_type || 'Standard Stock'}</strong>
                            </div>
                            <div className="border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                <span className="block text-[10px] text-[#6B7280] uppercase">Paper / Trim Size</span>
                                <strong className="text-[#1A1C1E]">{item.paper_size || 'Custom'}</strong>
                            </div>
                            <div className="border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                <span className="block text-[10px] text-[#6B7280] uppercase">Print Sides</span>
                                <strong className="text-[#1A1C1E]">{prettySides(item.print_sides)}</strong>
                            </div>
                            <div className="border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                <span className="block text-[10px] text-[#6B7280] uppercase">Color Mode</span>
                                <strong className="text-[#1A1C1E]">{prettyColor(item.color_mode)}</strong>
                            </div>
                            {item.compatibility && (
                                <div className="sm:col-span-2 border border-[#E5E7EB] p-2.5 bg-[#F9FAFB]">
                                    <span className="block text-[10px] text-[#6B7280] uppercase">Printer / Machine Compatibility</span>
                                    <strong className="text-[#1A1C1E]">{item.compatibility}</strong>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="space-y-3">
                    <section className="rounded-none border border-[#E5E7EB] bg-white p-4 font-mono text-xs">
                        <h3 className="mb-3 uppercase tracking-wider text-[#1A1C1E] border-b border-[#E5E7EB] pb-1 font-bold">
                            Inventory & Pricing
                        </h3>
                        <div className="space-y-2">
                            <div>
                                <span className="text-[#6B7280]">Available Stock Quantity:</span>
                                <div className="text-xl font-bold text-emerald-700">
                                    {item.available_quantity ?? 0} {item.unit || 'pcs'}
                                </div>
                            </div>
                            <div className="border-t border-[#E5E7EB] pt-2">
                                <span className="text-[#6B7280]">Base Price:</span>
                                <div className="text-lg font-bold text-[#1A1C1E]">₱{Number(item.base_price).toFixed(2)}</div>
                            </div>
                            <div className="border-t border-[#E5E7EB] pt-2">
                                <span className="text-[#6B7280]">Minimum Order Quantity:</span>
                                <div className="text-sm font-semibold text-[#1A1C1E]">{item.min_quantity} {item.unit || 'pcs'}</div>
                            </div>
                            <div className="border-t border-[#E5E7EB] pt-2">
                                <span className="text-[#6B7280]">Turnaround / Availability:</span>
                                <div className="text-xs font-semibold text-[#1A1C1E]">{item.turnaround_time}</div>
                            </div>
                        </div>
                    </section>

                    {item.notes && (
                        <section className="rounded-none border border-[#E5E7EB] bg-white p-4 text-xs font-mono">
                            <h3 className="mb-1 uppercase tracking-wider text-[#1A1C1E] font-bold border-b border-[#E5E7EB] pb-1">
                                Technical & Finishing Notes
                            </h3>
                            <p className="text-[#4B5563] mt-1 italic">{item.notes}</p>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

ShowPrintItem.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Printing Services',
            href: '/print-items',
        },
        {
            title: 'Details',
            href: '/print-items',
        },
    ],
};
