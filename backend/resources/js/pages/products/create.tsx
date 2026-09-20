import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { BAG_VIEWERS } from '@/components/bag-builder';
import { SHIRT_CATEGORIES, SHIRT_VIEWERS } from '@/components/shirt-builder';
import { PIN_SHAPES } from '@/components/pin-builder';
import { ShirtFlatIcon } from '@/components/shirt-flat';
import Product3DPreview from '@/components/product-3d-preview';
import { VESSEL_VIEWERS } from '@/components/vessel-builder';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { value: 'mugs', label: 'Mugs' },
    { value: 'pins', label: 'Pins' },
    { value: 'stickers', label: 'Stickers' },
    { value: 'tshirts', label: 'T-Shirts' },
    { value: 'tote_bags', label: 'Tote Bags' },
    { value: 'calendars', label: 'Calendars' },
    { value: 'printing', label: 'Printing' },
    { value: 'others', label: 'Others' },
];

const STATUSES = [
    { value: 'draft', label: 'Draft', dot: 'bg-gray-400' },
    { value: 'active', label: 'Active', dot: 'bg-emerald-500' },
    { value: 'inactive', label: 'Inactive', dot: 'bg-red-500' },
    { value: 'archived', label: 'Archived', dot: 'bg-gray-300' },
];

const VIEWERS = [
    { value: 'none', label: 'None — 2D only' },
    ...VESSEL_VIEWERS,
    ...BAG_VIEWERS,
    ...SHIRT_VIEWERS,
    { value: 'pin', label: 'Pin — 3D' },
    { value: 'sticker', label: 'Sticker — 3D' },
    { value: 'calendar', label: 'Calendar — 3D' },
    { value: 'glb', label: 'Custom .glb model' },
];

// Plain-only shirt categories are rendered as grouped SelectGroups — keeps own category as requested
// Only these T-shirt templates are offered: Regular (alias + regular), Slim-fit, Cropped.
// (Other fit morphs still exist in code + backend enum so old products keep rendering.)
const SHIRT_PICKABLE = ['shirt_regular', 'shirt_slim', 'shirt_cropped'] as const;
// Legacy alias `shirt` is kept at top of Common so old products still show correctly.
const VIEWER_GROUPS = [
    { id: 'none', label: '—', items: [{ value: 'none', label: 'None — 2D only' }] },
    { id: 'drinkware', label: '☕ Drinkware', items: VESSEL_VIEWERS as unknown as { value: string; label: string }[] },
    { id: 'bags', label: '👜 Bags', items: BAG_VIEWERS as unknown as { value: string; label: string }[] },
    {
        id: 'common',
        label: '👕 Common T-shirt types',
        items: [
            { value: 'shirt', label: 'T-Shirt — Regular — 3D (alias)' },
            ...SHIRT_CATEGORIES.find((c) => c.id === 'common')!
                .viewers.filter((v) => (SHIRT_PICKABLE as readonly string[]).includes(v.value))
                .map((v) => ({ value: v.value, label: v.label })),
        ],
    },
    { id: 'pins', label: '📌 Button Pin shapes', items: PIN_SHAPES.map((v) => ({ value: v.value, label: v.label })) },
    { id: 'other', label: 'Other', items: [{ value: 'sticker', label: 'Sticker — 3D' }, { value: 'calendar', label: 'Calendar — 3D' }, { value: 'glb', label: 'Custom .glb model' }] },
] as const;

const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    sku: 'SKU',
    category: 'Category',
    status: 'Status',
    base_price: 'Base price',
    compare_at_price: 'Compare-at price',
    short_description: 'Short description',
    thumbnail: 'Thumbnail',
    reference_image: 'Reference image',
    viewer_type: '3D viewer',
    model_3d_url: '3D model URL',
    max_text_length: 'Max text length',
};

function skuPreview(name: string, category: string): string {
    const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'PRODUCT';
    const prefixMap: Record<string, string> = {
        mugs: 'MUG',
        pins: 'PIN',
        stickers: 'STK',
        tshirts: 'TEE',
        tote_bags: 'TOTE',
        calendars: 'CAL',
    };
    const prefix = prefixMap[category] ?? 'PRD';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${base}-${rand}`;
}

const prettyField = (field: string) => FIELD_LABELS[field] ?? field.replace(/_/g, ' ');

const inputCls =
    'h-8 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-normal text-[#1A1C1E] placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-1 focus-visible:ring-[#1A1C1E]/10';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-normal text-[#4A4E5A]">{label}</p>
            {children}
            {error && <InputError message={error} />}
        </div>
    );
}

function Section({
    title,
    children,
    className = '',
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`rounded-lg border border-[#E5E7EB] bg-white p-4 ${className}`}>
            <h3 className="mb-3 border-b border-[#E5E7EB] pb-2 text-[12px] font-normal tracking-wide text-[#1A1C1E]">{title}</h3>
            {children}
        </section>
    );
}

function Chip({
    title,
    checked,
    onChange,
}: {
    title: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-2 py-1 text-[11px] font-normal text-[#4A4E5A]">
            <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
            {title}
        </label>
    );
}

export function ProductForm({
    initial,
    onSubmit,
    processing,
    errors,
    setData,
    data,
    submitLabel,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) {
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const errorBoxRef = useRef<HTMLDivElement>(null);
    const errorEntries = Object.entries((errors ?? {}) as Record<string, string>);

    useEffect(() => {
        if (errorEntries.length > 0) errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scroll only when a fresh validation response arrives.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errors]);

    // Auto-generate SKU on create when name is typed and SKU is still empty
    useEffect(() => {
        if (initial) return;
        if (data.sku?.trim()) return;
        if (!data.name?.trim() || data.name.trim().length < 2) return;
        const next = skuPreview(data.name, data.category);
        setData('sku', next as never);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.name, data.category]);

    const generateWithAi = async () => {
        if (!data.name?.trim()) {
            setAiError('Type a product name first, then generate.');
            return;
        }
        setAiLoading(true);
        setAiError('');
        try {
            const res = await fetch('/api/v1/products/ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    category: data.category,
                    hint: data.description ?? '',
                }),
            });
            const json = await res.json();
            if (!res.ok || json.status !== 'success') throw new Error(json.message || 'AI assist failed');
            const s = json.data;
            const apply = (key: string, value: unknown) => {
                if (value !== undefined && value !== null && value !== '') setData(key as never, value as never);
            };
            apply('short_description', s.short_description);
            apply('description', s.description);
            apply('badge', s.badge);
            apply('print_method', s.print_method);
            apply('print_size', s.print_size);
            apply('viewer_type', s.viewer_type);
            apply('customization_addon_price', s.customization_addon_price);
            apply('max_text_length', s.max_text_length);
            ['has_3d_preview', 'is_customizable', 'allow_color_change', 'allow_custom_text', 'allow_image_upload'].forEach(
                (k) => {
                    if (typeof s[k] === 'boolean') setData(k as never, s[k] as never);
                },
            );
            if (!data.sku?.trim()) apply('sku', s.sku);
        } catch (e) {
            setAiError(e instanceof Error ? e.message : 'AI assist failed');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <form onSubmit={onSubmit}>
            {/* top text — compact single line so it never gets sliced at the viewport edge */}
            <div className="mb-3">
                <h2 className="text-[14px] font-bold text-[#1A1C1E]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Create product</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">Add pricing, inventory and 3D preview settings for your new product.</p>
            </div>

            {errorEntries.length > 0 && (
                <div ref={errorBoxRef} className="mb-3 scroll-mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-normal text-red-800">
                        Please fix {errorEntries.length} field{errorEntries.length > 1 ? 's' : ''} to continue:
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] font-normal text-red-700">
                        {errorEntries.map(([field, message]) => (
                            <li key={field}>
                                <span className="font-normal">{prettyField(field)}:</span> {String(message)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid items-start gap-3 xl:grid-cols-2">
                {/* LEFT — basic + pricing */}
                <div className="space-y-3">
                    <Section title="Basic info">
                        <button
                            type="button"
                            onClick={generateWithAi}
                            disabled={aiLoading}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A1C1E] px-3 py-2 text-[11px] font-normal text-white transition hover:bg-black disabled:opacity-50"
                        >
                            {aiLoading ? 'Generating…' : '✦ Generate details with AI'}
                        </button>
                        {aiError && <p className="mb-2 text-[11px] font-normal text-red-600">{aiError}</p>}
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Name *" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Custom Ceramic Mug 11oz" className={inputCls} />
                            </Field>
                            <Field label="SKU — auto" error={errors.sku}>
                                <div className="flex gap-1.5">
                                    <Input
                                        value={data.sku}
                                        onChange={(e) => setData('sku', e.target.value)}
                                        placeholder="Auto — e.g. MUG-CUSTOMCE-A1B2"
                                        className={`${inputCls} flex-1 bg-[#F8F9FC] font-mono text-[11px] font-normal`}
                                    />
                                    <Button type="button" variant="outline" className="h-8 shrink-0 rounded-lg px-2.5 text-[11px] font-normal" onClick={() => { const f = data.name?.trim() ? data.name : 'Product'; setData('sku', skuPreview(f, data.category) as never); }} title="Regenerate SKU">↻</Button>
                                </div>
                                <p className="text-[10px] font-normal text-[#8A8FA3]">Auto from name. You can still edit or leave empty — it will generate on save.</p>
                            </Field>
                            <Field label="Category *" error={errors.category}>
                                <Select value={data.category} onValueChange={(v) => setData('category', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Status *" error={errors.status}>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                <span className="flex items-center gap-2">
                                                    <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                                                    {s.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Short description" error={errors.short_description}>
                                    <Input value={data.short_description ?? ''} onChange={(e) => setData('short_description', e.target.value)} placeholder="High-gloss ceramic for home or office" className={inputCls} />
                                </Field>
                            </div>
                            <div className="sm:col-span-2">
                                <Field label="Description" error={errors.description}>
                                    <textarea
                                        value={data.description ?? ''}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={2}
                                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2 text-[11px] font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                        placeholder="Materials, print method, use case…"
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Pricing & inventory">
                        <div className="grid gap-2 sm:grid-cols-3">
                            <Field label="Base ₱ *" error={errors.base_price}>
                                <Input type="number" step="0.01" min="0" value={data.base_price} onChange={(e) => setData('base_price', e.target.value)} placeholder="9.99" className={inputCls} />
                            </Field>
                            <Field label="Compare ₱" error={errors.compare_at_price}>
                                <Input type="number" step="0.01" min="0" value={data.compare_at_price ?? ''} onChange={(e) => setData('compare_at_price', e.target.value)} placeholder="12.99" className={inputCls} />
                            </Field>
                            <Field label="Unit" error={errors.unit}>
                                <Input value={data.unit ?? 'piece'} onChange={(e) => setData('unit', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Stock" error={errors.stock_quantity}>
                                <Input type="number" value={data.stock_quantity ?? 0} onChange={(e) => setData('stock_quantity', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Badge" error={errors.badge}>
                                <Input value={data.badge ?? ''} onChange={(e) => setData('badge', e.target.value)} placeholder="Bestseller" className={inputCls} />
                            </Field>
                            <Field label="Sort" error={errors.sort_order}>
                                <Input type="number" value={data.sort_order ?? 0} onChange={(e) => setData('sort_order', e.target.value)} className={inputCls} />
                            </Field>
                        </div>
                    </Section>
                </div>

                {/* RIGHT — 3D preview (compact, right side only) + options */}
                <div className="space-y-3">
                    <Section title="3D preview">
                        <Product3DPreview
                            viewerType={data.viewer_type ?? 'none'}
                            label={data.name ?? ''}
                            modelUrl={data.model_3d_url ?? ''}
                            designImageUrl={data.thumbnail ?? ''}
                        />
                        <div className="mt-3">
                            <Field label="3D vessel / template — plain only, same white layout" error={errors.viewer_type}>
                                <Select value={data.viewer_type ?? 'none'} onValueChange={(v) => setData('viewer_type', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[380px]">
                                        {VIEWER_GROUPS.map((group, idx) => (
                                            <SelectGroup key={group.id}>
                                                <SelectLabel className="bg-[#F9FAFB] text-[11px] font-bold tracking-wide text-[#1A1C1E]">{group.label}</SelectLabel>
                                                {group.items.map((v) => (
                                                    <SelectItem key={`${group.id}-${v.value}`} value={v.value} className="pl-6 text-[11px] font-normal">
                                                        <span className="flex items-center gap-2">
                                                            {group.id === 'common' && (
                                                                <ShirtFlatIcon type={v.value} className="h-7 w-6 shrink-0" />
                                                            )}
                                                            {v.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                                {idx < VIEWER_GROUPS.length - 1 && <SelectSeparator />}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="mt-1 text-[10px] font-normal text-[#6B7280]">👕 Regular, Slim-fit + Cropped — plain white with same studio layout.</p>
                            </Field>
                        </div>
                    </Section>

                    <Section title="Customizable & 3D">
                        <div className="grid grid-cols-2 gap-2">
                            <Chip title="Customizable" checked={!!data.is_customizable} onChange={(v) => setData('is_customizable', v)} />
                            <Chip title="3D preview" checked={!!data.has_3d_preview} onChange={(v) => setData('has_3d_preview', v)} />
                            <Chip title="Color choices" checked={!!data.allow_color_change} onChange={(v) => setData('allow_color_change', v)} />
                            <Chip title="Custom text" checked={!!data.allow_custom_text} onChange={(v) => setData('allow_custom_text', v)} />
                            <Chip title="Image upload" checked={!!data.allow_image_upload} onChange={(v) => setData('allow_image_upload', v)} />
                            {data.allow_custom_text ? (
                                <Field label="Max text length" error={errors.max_text_length}>
                                    <Input type="number" min="1" value={data.max_text_length ?? 30} onChange={(e) => setData('max_text_length', e.target.value)} className={inputCls} />
                                </Field>
                            ) : (
                                <Chip title="Featured home" checked={!!data.is_featured_home} onChange={(v) => setData('is_featured_home', v)} />
                            )}
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <Field label="Add-on ₱" error={errors.customization_addon_price}>
                                <Input type="number" step="0.01" min="0" value={data.customization_addon_price ?? ''} onChange={(e) => setData('customization_addon_price', e.target.value)} placeholder="0.00" className={inputCls} />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Visibility & save">
                        <div className="grid grid-cols-2 gap-2">
                            <Chip title="Featured home" checked={!!data.is_featured_home} onChange={(v) => setData('is_featured_home', v)} />
                            <Chip title="Featured services" checked={!!data.is_featured_services} onChange={(v) => setData('is_featured_services', v)} />
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Button type="submit" disabled={processing} className="flex-1">
                                {processing ? 'Saving…' : submitLabel}
                            </Button>
                            <Link href="/products">
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </Section>
                </div>
            </div>
            {initial && <span className="hidden" />}
        </form>
    );
}

const EMPTY_PRODUCT = {
    name: '',
    slug: '',
    category: 'mugs',
    description: '',
    short_description: '',
    badge: '',
    status: 'draft',
    base_price: '',
    compare_at_price: '',
    unit: 'piece',
    sku: '',
    stock_quantity: 0,
    low_stock_alert_at: 20,
    track_inventory: true,
    thumbnail: '',
    reference_image: null,
    gallery_images: [],
    has_3d_preview: false,
    is_customizable: false,
    viewer_type: 'none',
    model_3d_url: '',
    fallback_image: '',
    allow_color_change: false,
    available_colors: [],
    allow_custom_text: false,
    max_text_length: 30,
    allow_image_upload: false,
    print_method: '',
    print_size: '',
    customization_addon_price: '',
    has_variants: false,
    is_featured_home: false,
    is_featured_services: false,
    sort_order: 0,
};

export default function CreateProduct() {
    const { data, setData, post, processing, errors } = useForm({ ...EMPTY_PRODUCT });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/products');
    };

    return (
        <>
            <Head title="Add new product" />
            <ProductForm
                data={data}
                setData={setData}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Create product"
            />
        </>
    );
}

CreateProduct.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Products',
            href: '/products',
        },
        {
            title: 'Create',
            href: '/products/create',
        },
    ],
};
