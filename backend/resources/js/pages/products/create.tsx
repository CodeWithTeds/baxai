import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import Product3DPreview from '@/components/product-3d-preview';
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
    { value: 'mug', label: 'Mug — 3D' },
    { value: 'pin', label: 'Pin — 3D' },
    { value: 'shirt', label: 'T-Shirt — 3D' },
    { value: 'tote', label: 'Tote Bag — 3D' },
    { value: 'sticker', label: 'Sticker — 3D' },
    { value: 'calendar', label: 'Calendar — 3D' },
    { value: 'glb', label: 'Custom .glb model' },
];

const inputCls =
    'h-11 rounded-xl border-[#E9EBF3] bg-white px-4 text-[15px] text-[#1A1C1E] placeholder:text-[#B9BED1] focus-visible:border-[#1A1C1E] focus-visible:ring-0';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <p className="text-[13px] font-bold text-[#1A1C1E]">{label}</p>
            {children}
            {error && <InputError message={error} />}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_-24px_rgba(26,28,30,0.3)]">
            <h3 className="mb-4 text-[16px] font-extrabold tracking-tight text-[#1A1C1E]">{title}</h3>
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
        <label className="flex cursor-pointer items-center gap-3 py-2 text-[14px] font-semibold text-[#1A1C1E]">
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
            <div className="grid items-start gap-4 xl:grid-cols-2">
                {/* LEFT — basic + pricing */}
                <div className="space-y-4">
                    <Section title="Basic info">
                        <button
                            type="button"
                            onClick={generateWithAi}
                            disabled={aiLoading}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1C1E] py-2.5 text-[14px] font-bold text-white transition hover:bg-black disabled:opacity-50"
                        >
                            {aiLoading ? 'Generating…' : '✨ Generate details with AI'}
                        </button>
                        {aiError && <p className="mb-3 text-[13px] font-semibold text-red-600">{aiError}</p>}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Name *" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Custom Ceramic Mug 11oz" className={inputCls} />
                            </Field>
                            <Field label="SKU *" error={errors.sku}>
                                <Input value={data.sku} onChange={(e) => setData('sku', e.target.value)} placeholder="MUG-11OZ-WHT" className={inputCls} />
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
                                        rows={3}
                                        className="w-full rounded-xl border border-[#E9EBF3] bg-white px-4 py-2.5 text-[15px] text-[#1A1C1E] outline-none placeholder:text-[#B9BED1] focus:border-[#1A1C1E]"
                                        placeholder="Materials, print method, use case…"
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Pricing & inventory">
                        <div className="grid gap-3 sm:grid-cols-3">
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

                {/* RIGHT — preview + customizable + visibility */}
                <div className="space-y-4">
                    <Section title="3D preview">
                        <Product3DPreview
                            viewerType={data.viewer_type ?? 'none'}
                            label={data.name ?? ''}
                            modelUrl={data.model_3d_url ?? ''}
                        />
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
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Field label="3D viewer" error={errors.viewer_type}>
                                <Select value={data.viewer_type ?? 'none'} onValueChange={(v) => setData('viewer_type', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VIEWERS.map((v) => (
                                            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="3D model URL" error={errors.model_3d_url}>
                                <Input value={data.model_3d_url ?? ''} onChange={(e) => setData('model_3d_url', e.target.value)} placeholder="https://…/mug.glb" className={inputCls} />
                            </Field>
                            <Field label="Thumbnail" error={errors.thumbnail}>
                                <Input value={data.thumbnail ?? ''} onChange={(e) => setData('thumbnail', e.target.value)} placeholder="/storage/products/mug.jpg" className={inputCls} />
                            </Field>
                            <Field label="Print method" error={errors.print_method}>
                                <Input value={data.print_method ?? ''} onChange={(e) => setData('print_method', e.target.value)} placeholder="sublimation" className={inputCls} />
                            </Field>
                            <Field label="Print size" error={errors.print_size}>
                                <Input value={data.print_size ?? ''} onChange={(e) => setData('print_size', e.target.value)} placeholder="8 × 3.5 cm" className={inputCls} />
                            </Field>
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
                        <div className="mt-4 flex gap-2">
                            <Button type="submit" disabled={processing} className="flex-1 rounded-xl bg-[#1A1C1E] py-3 text-[14px] font-bold text-white hover:bg-black">
                                {processing ? 'Saving…' : submitLabel}
                            </Button>
                            <Link href="/products">
                                <Button variant="outline" type="button" className="rounded-xl bg-[#EEF0F7] px-5 py-3 text-[14px] font-bold text-[#1A1C1E] hover:bg-[#E2E5F1]">
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
