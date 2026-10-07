import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { Camera, CheckCircle2, Image as ImageIcon, Sparkles, Upload, X } from 'lucide-react';
import CameraScanModal, { RecognizedProductData } from '@/components/camera-scan-modal';

interface PrintCategoryOption {
    id: number;
    name: string;
    code: string;
}

const STATUSES = [
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
];

const PRINT_SIDES = [
    { value: 'single_sided', label: 'Single-Sided (1S)' },
    { value: 'double_sided', label: 'Double-Sided (2S)' },
    { value: 'variable', label: 'Variable / Custom' },
];

const COLOR_MODES = [
    { value: 'full_color', label: 'Full Color (CMYK)' },
    { value: 'monochrome', label: 'Monochrome (B&W)' },
    { value: 'grayscale', label: 'Grayscale' },
];

const FIELD_LABELS: Record<string, string> = {
    name: 'Item / Resource Name',
    item_code: 'Item Code',
    category_id: 'Category',
    description: 'Description',
    paper_type: 'Paper Stock',
    paper_size: 'Paper Size',
    brand: 'Brand',
    model: 'Model',
    available_quantity: 'Available Quantity',
    unit: 'Unit of Measure',
    compatibility: 'Compatibility',
    print_sides: 'Print Sides',
    color_mode: 'Color Mode',
    turnaround_time: 'Turnaround Time',
    base_price: 'Base Price',
    min_quantity: 'Minimum Order Quantity',
    status: 'Status',
    notes: 'Notes',
    image: 'Item Image',
    image_url: 'Image URL',
};

const inputCls =
    'h-8 rounded-none border border-[#D1D5DB] bg-white px-2.5 text-xs font-normal text-[#1A1C1E] placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-mono text-[#4A4E5A]">{label}</p>
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
        <section className={`rounded-none border border-[#E5E7EB] bg-white p-3.5 ${className}`}>
            <h3 className="mb-3 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">{title}</h3>
            {children}
        </section>
    );
}

export function PrintItemForm({
    initial,
    categories = [],
    onSubmit,
    processing,
    errors,
    setData,
    data,
    submitLabel,
}: any) {
    const errorBoxRef = useRef<HTMLDivElement>(null);
    const errorEntries = Object.entries((errors ?? {}) as Record<string, string>);
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(data.image_url || null);

    useEffect(() => {
        if (data.image && data.image instanceof File) {
            const objectUrl = URL.createObjectURL(data.image);
            setImagePreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (data.image_url) {
            setImagePreview(data.image_url);
        } else {
            setImagePreview(null);
        }
    }, [data.image, data.image_url]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('image', file);
        }
    };

    const removeImage = () => {
        setData('image', null);
        setData('image_url', '');
        setImagePreview(null);
    };

    useEffect(() => {
        if (errorEntries.length > 0) errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [errors]);

    const handleAiRecognize = (recognized: RecognizedProductData) => {
        if (recognized.name) setData('name', recognized.name);
        if (recognized.brand !== undefined) setData('brand', recognized.brand);
        if (recognized.model !== undefined) setData('model', recognized.model);
        if (recognized.category_id) setData('category_id', recognized.category_id);
        if (recognized.paper_type !== undefined) setData('paper_type', recognized.paper_type);
        if (recognized.paper_size !== undefined) setData('paper_size', recognized.paper_size);
        if (recognized.compatibility !== undefined) setData('compatibility', recognized.compatibility);
        if (recognized.available_quantity !== undefined) setData('available_quantity', recognized.available_quantity);
        if (recognized.unit) setData('unit', recognized.unit);
        if (recognized.description) setData('description', recognized.description);
        if (recognized.notes) setData('notes', recognized.notes);

        setAiSuccessMessage(`Auto-filled: "${recognized.name}" recognized from camera photo!`);
        setTimeout(() => setAiSuccessMessage(null), 8000);
    };

    const prettyField = (field: string) => FIELD_LABELS[field] ?? field.replace(/_/g, ' ');

    return (
        <form onSubmit={onSubmit} className="font-sans text-[#1A1C1E]">
            {/* HEADING SECTION */}
            <div className="mb-3 border-b border-[#E5E7EB] pb-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-[15px] font-bold text-[#1A1C1E]">
                            {initial ? `Edit Resource / Service` : 'Add Resource / Service'}
                            {initial?.item_code && (
                                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                    [{initial.item_code}]
                                </span>
                            )}
                        </h2>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Configure printing stock, equipment specifications, available quantity, ink compatibility, and pricing rules.
                        </p>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setScanModalOpen(true)}
                        className="h-8 rounded-none border border-emerald-600 bg-emerald-50 px-3 text-xs font-mono font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 shadow-sm"
                    >
                        <Camera size={14} className="text-emerald-700" />
                        <Sparkles size={12} className="text-emerald-600" />
                        AI Camera Scan
                    </Button>
                </div>
            </div>

            {aiSuccessMessage && (
                <div className="mb-3 rounded-none border border-emerald-300 bg-emerald-50 p-2 text-xs font-mono text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{aiSuccessMessage}</span>
                </div>
            )}

            {errorEntries.length > 0 && (
                <div ref={errorBoxRef} className="mb-3 scroll-mt-4 rounded-none border border-red-300 bg-red-50 p-2.5 text-xs">
                    <p className="font-mono text-[#1A1C1E]">
                        Please resolve {errorEntries.length} field validation error{errorEntries.length > 1 ? 's' : ''}:
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] font-mono text-red-700">
                        {errorEntries.map(([field, message]) => (
                            <li key={field}>
                                <span>{prettyField(field)}:</span> {String(message)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid items-start gap-3 xl:grid-cols-2">
                {/* LEFT — Basic Info & Equipment/Stock Specs */}
                <div className="space-y-3">
                    <Section title="Basic Resource Info">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Field label="Resource / Service Name *" error={errors.name}>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="e.g. 70gsm Premium Bond Paper Reams"
                                            className={inputCls}
                                        />
                                        <Button
                                            type="button"
                                            title="Scan Product Label with AI Camera"
                                            onClick={() => setScanModalOpen(true)}
                                            variant="outline"
                                            className="h-8 rounded-none border-[#D1D5DB] px-2.5 text-xs font-mono bg-white hover:bg-gray-50 text-emerald-800"
                                        >
                                            <Camera size={13} className="mr-1 text-emerald-700" />
                                            Scan
                                        </Button>
                                    </div>
                                </Field>
                            </div>

                            <Field label="Category *" error={errors.category_id}>
                                <Select value={String(data.category_id ?? '')} onValueChange={(v) => setData('category_id', Number(v))}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {categories.map((c: PrintCategoryOption) => (
                                            <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                                {c.name} ({c.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Item Code" error={errors.item_code}>
                                <Input
                                    value={data.item_code}
                                    onChange={(e) => setData('item_code', e.target.value)}
                                    placeholder="Auto — e.g. STK-BOND-0001"
                                    className={`${inputCls} bg-[#F9FAFB] font-mono text-[11px]`}
                                />
                            </Field>

                            <Field label="Status *" error={errors.status}>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value} className="text-xs">
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Print Item Image" error={errors.image || errors.image_url}>
                                    <div className="flex items-center gap-3 border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-2.5">
                                        {imagePreview ? (
                                            <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-[#E5E7EB] bg-white">
                                                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                                                    title="Remove Image"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-dashed border-[#D1D5DB] bg-white text-muted-foreground">
                                                <ImageIcon size={24} className="text-[#9CA3AF]" />
                                            </div>
                                        )}

                                        <div className="flex-1 space-y-1 font-mono text-xs">
                                            <p className="font-sans text-xs font-semibold text-[#1A1C1E]">Upload Item Photo</p>
                                            <p className="text-[10px] text-[#6B7280]">PNG, JPG, WEBP or GIF (Max 10MB)</p>
                                            <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[#D1D5DB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1A1C1E] shadow-sm hover:bg-gray-50">
                                                <Upload size={12} className="text-[#4B5563]" />
                                                <span>{imagePreview ? 'Change Image' : 'Select Image File'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageChange}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </Field>
                            </div>

                            <div className="sm:col-span-2">
                                <Field label="Description" error={errors.description}>
                                    <textarea
                                        value={data.description ?? ''}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={2}
                                        className="w-full rounded-none border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                        placeholder="Detailed description of stock, equipment usage, or print service..."
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Paper Stock & Equipment Details">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Brand / Manufacturer" error={errors.brand}>
                                <Input value={data.brand ?? ''} onChange={(e) => setData('brand', e.target.value)} placeholder="e.g. Epson, HP, Advance, Orajet" className={inputCls} />
                            </Field>

                            <Field label="Model / Part Number" error={errors.model}>
                                <Input value={data.model ?? ''} onChange={(e) => setData('model', e.target.value)} placeholder="e.g. L3210, CE285A, AP-70A4" className={inputCls} />
                            </Field>

                            <Field label="Paper Stock Type" error={errors.paper_type}>
                                <Input value={data.paper_type ?? ''} onChange={(e) => setData('paper_type', e.target.value)} placeholder="e.g. 70gsm Bond, 260gsm Photo Paper" className={inputCls} />
                            </Field>

                            <Field label="Paper / Trim Size" error={errors.paper_size}>
                                <Input value={data.paper_size ?? ''} onChange={(e) => setData('paper_size', e.target.value)} placeholder="e.g. A4, 4R, Letter, 1.2m Roll" className={inputCls} />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Printer / Machine Compatibility" error={errors.compatibility}>
                                    <Input
                                        value={data.compatibility ?? ''}
                                        onChange={(e) => setData('compatibility', e.target.value)}
                                        placeholder="e.g. Compatible with Epson EcoTank L3210 / HP LaserJet Pro P1102"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* RIGHT — Inventory, Pricing & Specifications */}
                <div className="space-y-3">
                    <Section title="Inventory & Stock Quantity">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Available Quantity *" error={errors.available_quantity}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={data.available_quantity ?? 0}
                                    onChange={(e) => setData('available_quantity', Number(e.target.value))}
                                    placeholder="0"
                                    className={`${inputCls} font-mono font-bold text-emerald-700`}
                                />
                            </Field>

                            <Field label="Unit of Measure" error={errors.unit}>
                                <Input
                                    value={data.unit ?? ''}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    placeholder="e.g. reams, packs, rolls, cartridges, units"
                                    className={inputCls}
                                />
                            </Field>

                            <Field label="Base Price (₱) *" error={errors.base_price}>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.base_price ?? ''}
                                    onChange={(e) => setData('base_price', e.target.value)}
                                    placeholder="220.00"
                                    className={`${inputCls} font-mono`}
                                />
                            </Field>

                            <Field label="Minimum Quantity *" error={errors.min_quantity}>
                                <Input
                                    type="number"
                                    min="1"
                                    value={data.min_quantity ?? 1}
                                    onChange={(e) => setData('min_quantity', Number(e.target.value))}
                                    placeholder="1"
                                    className={`${inputCls} font-mono`}
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Turnaround / Lead Time" error={errors.turnaround_time}>
                                    <Input
                                        value={data.turnaround_time ?? ''}
                                        onChange={(e) => setData('turnaround_time', e.target.value)}
                                        placeholder="e.g. In Stock, In Service, or 1-2 Business Days"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Print Modes & Technical Notes">
                        <div className="grid gap-2 sm:grid-cols-2 mb-2">
                            <Field label="Print Sides *" error={errors.print_sides}>
                                <Select value={data.print_sides} onValueChange={(v) => setData('print_sides', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select sides" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {PRINT_SIDES.map((ps) => (
                                            <SelectItem key={ps.value} value={ps.value} className="text-xs">
                                                {ps.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Color Mode *" error={errors.color_mode}>
                                <Select value={data.color_mode} onValueChange={(v) => setData('color_mode', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select color mode" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {COLOR_MODES.map((cm) => (
                                            <SelectItem key={cm.value} value={cm.value} className="text-xs">
                                                {cm.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <Field label="Notes & Specifications" error={errors.notes}>
                            <textarea
                                value={data.notes ?? ''}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={2}
                                className="w-full rounded-none border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                placeholder="Page yield, storage conditions, cutting instructions, warranty..."
                            />
                        </Field>

                        <div className="mt-3 flex items-center gap-2">
                            <Button type="submit" disabled={processing} className="h-8 rounded-none bg-[#1A1C1E] px-4 text-xs font-normal text-white hover:bg-black flex-1">
                                {processing ? 'Saving…' : submitLabel}
                            </Button>
                            <Link href="/print-items">
                                <Button variant="outline" type="button" className="h-8 rounded-none border-[#D1D5DB] px-3 text-xs font-normal text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </Section>
                </div>
            </div>

            {/* CAMERA SCANNER MODAL */}
            <CameraScanModal
                open={scanModalOpen}
                onClose={() => setScanModalOpen(false)}
                onRecognize={handleAiRecognize}
            />
        </form>
    );
}

export default function CreatePrintItem({ categories = [] }: { categories: PrintCategoryOption[] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        item_code: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        description: '',
        paper_type: '70gsm Premium Bond Paper',
        paper_size: 'A4 (8.27 x 11.69 in)',
        brand: '',
        model: '',
        available_quantity: 100,
        unit: 'reams',
        compatibility: '',
        print_sides: 'single_sided',
        color_mode: 'full_color',
        turnaround_time: 'In Stock',
        base_price: '0.00',
        min_quantity: 1,
        status: 'active',
        notes: '',
        image: null as File | null,
        image_url: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/print-items');
    };

    return (
        <>
            <Head title="Add Resource / Service — Admin" />
            <PrintItemForm
                data={data}
                setData={setData}
                categories={categories}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Create Printing Resource"
            />
        </>
    );
}

CreatePrintItem.layout = {
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
            title: 'Add Resource',
            href: '/print-items/create',
        },
    ],
};
