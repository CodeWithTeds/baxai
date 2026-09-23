import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useRef } from 'react';
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
import { RotateCcw } from 'lucide-react';

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
    name: 'Item Name',
    item_code: 'Item Code',
    category_id: 'Category',
    description: 'Description',
    paper_type: 'Paper Stock',
    paper_size: 'Paper Size',
    print_sides: 'Print Sides',
    color_mode: 'Color Mode',
    turnaround_time: 'Turnaround Time',
    base_price: 'Base Price',
    min_quantity: 'Minimum Quantity',
    status: 'Status',
    notes: 'Notes',
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
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) {
    const errorBoxRef = useRef<HTMLDivElement>(null);
    const errorEntries = Object.entries((errors ?? {}) as Record<string, string>);

    useEffect(() => {
        if (errorEntries.length > 0) errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errors]);

    const prettyField = (field: string) => FIELD_LABELS[field] ?? field.replace(/_/g, ' ');

    return (
        <form onSubmit={onSubmit} className="font-sans text-[#1A1C1E]">
            {/* HEADING SECTION */}
            <div className="mb-3 border-b border-[#E5E7EB] pb-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[15px] font-bold text-[#1A1C1E]">
                        {initial ? `Edit Print Service` : 'Add Print Service'}
                        {initial?.item_code && (
                            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                [{initial.item_code}]
                            </span>
                        )}
                    </h2>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                    Configure commercial printing specifications, paper stock materials, turnarounds, and pricing tiers.
                </p>
            </div>

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
                {/* LEFT — Service Info & Specifications */}
                <div className="space-y-3">
                    <Section title="Basic Service Info">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Print Service Name *" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Standard Document Printing" className={inputCls} />
                            </Field>

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
                                    placeholder="Auto — e.g. PRT-DOCS-0001"
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
                                <Field label="Description" error={errors.description}>
                                    <textarea
                                        value={data.description ?? ''}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={2}
                                        className="w-full rounded-none border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                        placeholder="Detailed description of print service, paper material, and ideal use cases…"
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Paper & Print Specifications">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Paper Stock Material" error={errors.paper_type}>
                                <Input value={data.paper_type ?? ''} onChange={(e) => setData('paper_type', e.target.value)} placeholder="e.g. 200gsm Glossy C2S Cardstock" className={inputCls} />
                            </Field>

                            <Field label="Paper / Trim Size" error={errors.paper_size}>
                                <Input value={data.paper_size ?? ''} onChange={(e) => setData('paper_size', e.target.value)} placeholder="e.g. A4 (8.27 x 11.69 in)" className={inputCls} />
                            </Field>

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
                    </Section>
                </div>

                {/* RIGHT — Pricing & Turnaround */}
                <div className="space-y-3">
                    <Section title="Pricing & Turnaround Time">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Base Price (₱) *" error={errors.base_price}>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.base_price ?? ''}
                                    onChange={(e) => setData('base_price', e.target.value)}
                                    placeholder="150.00"
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
                                <Field label="Turnaround Time" error={errors.turnaround_time}>
                                    <Input
                                        value={data.turnaround_time ?? ''}
                                        onChange={(e) => setData('turnaround_time', e.target.value)}
                                        placeholder="e.g. Same Day Express or 1-2 Business Days"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Notes & Save Actions">
                        <Field label="Special Finishing Notes & Guidelines" error={errors.notes}>
                            <textarea
                                value={data.notes ?? ''}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                className="w-full rounded-none border border-[#D1D5DB] bg-white px-2.5 py-2 text-xs font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                placeholder="Lamination finish, binding style, cutting options, UV spot coating notes…"
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
        print_sides: 'single_sided',
        color_mode: 'full_color',
        turnaround_time: '1-2 Business Days',
        base_price: '0.00',
        min_quantity: 1,
        status: 'active',
        notes: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/print-items');
    };

    return (
        <>
            <Head title="Add Print Service — Admin" />
            <PrintItemForm
                data={data}
                setData={setData}
                categories={categories}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Create Print Service"
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
            title: 'Add Print Service',
            href: '/print-items/create',
        },
    ],
};
