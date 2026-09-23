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

const STATUSES = [
    { value: 'active', label: 'Active', dot: 'bg-[#1A1C1E]' },
    { value: 'lead', label: 'Lead', dot: 'bg-gray-500' },
    { value: 'draft', label: 'Draft', dot: 'bg-gray-400' },
    { value: 'inactive', label: 'Inactive', dot: 'bg-gray-400' },
    { value: 'archived', label: 'Archived', dot: 'bg-gray-300' },
];

const TYPES = [
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' },
    { value: 'vip', label: 'VIP' },
    { value: 'wholesale', label: 'Wholesale' },
];

const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    customer_code: 'Customer code',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    status: 'Status',
    type: 'Customer type',
    address: 'Address',
    city: 'City',
    state: 'State',
    postal_code: 'Postal code',
    country: 'Country',
    notes: 'Notes',
};

function codePreview(name: string, type: string): string {
    const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'CUST';
    const prefixMap: Record<string, string> = {
        business: 'BIZ',
        vip: 'VIP',
        wholesale: 'WHL',
        individual: 'CUST',
    };
    const prefix = prefixMap[type] ?? 'CUST';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${base}-${rand}`;
}

const prettyField = (field: string) => FIELD_LABELS[field] ?? field.replace(/_/g, ' ');

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

export function CustomerForm({
    initial,
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

    // Auto-generate Customer code on create when name is typed and code is empty
    useEffect(() => {
        if (initial) return;
        if (data.customer_code?.trim()) return;
        if (!data.name?.trim() || data.name.trim().length < 2) return;
        const next = codePreview(data.name, data.type);
        setData('customer_code', next as never);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.name, data.type]);

    return (
        <form onSubmit={onSubmit} className="font-sans text-[#1A1C1E]">
            {/* HEADING SECTION MATCHING /CUSTOMERS */}
            <div className="mb-3 border-b border-[#E5E7EB] pb-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[15px] font-bold text-[#1A1C1E]">
                        {initial ? `Edit Customer` : 'Create Customer'}
                        {initial?.customer_code && (
                            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                [{initial.customer_code}]
                            </span>
                        )}
                    </h2>
                    {initial?.type && (
                        <span className="rounded-none border border-[#D1D5DB] bg-white px-2 py-0.5 text-[10px] font-mono tracking-wider text-[#374151] uppercase">
                            {initial.type}
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                    {initial
                        ? 'Update customer contact information, account classification, address, and client preferences.'
                        : 'Add customer contact details, business classification, and shipping address for client management.'}
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
                {/* LEFT — basic + contact info */}
                <div className="space-y-3">
                    <Section title="Basic Info & Classification">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Full Name *" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Maria Santos" className={inputCls} />
                            </Field>
                            <Field label="Customer Code" error={errors.customer_code}>
                                <div className="flex gap-1">
                                    <Input
                                        value={data.customer_code}
                                        onChange={(e) => setData('customer_code', e.target.value)}
                                        placeholder="Auto — e.g. CUST-MARIA-A1B2"
                                        className={`${inputCls} flex-1 bg-[#F9FAFB] font-mono text-[11px]`}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 rounded-none border-[#D1D5DB] px-2 text-xs font-mono text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                                        onClick={() => {
                                            const f = data.name?.trim() ? data.name : 'Customer';
                                            setData('customer_code', codePreview(f, data.type) as never);
                                        }}
                                        title="Regenerate Code"
                                    >
                                        <RotateCcw size={12} />
                                    </Button>
                                </div>
                            </Field>
                            <Field label="Email Address *" error={errors.email}>
                                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="maria@example.com" className={inputCls} />
                            </Field>
                            <Field label="Phone Number" error={errors.phone}>
                                <Input
                                    value={data.phone ?? ''}
                                    onChange={(e) => setData('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    placeholder="09171234567"
                                    maxLength={11}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Company Name" error={errors.company}>
                                <Input value={data.company ?? ''} onChange={(e) => setData('company', e.target.value)} placeholder="Santos Cafe & Bakery" className={inputCls} />
                            </Field>
                            <Field label="Status *" error={errors.status}>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value} className="text-xs">
                                                <span className="flex items-center gap-2">
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                                                    {s.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Customer Type *" error={errors.type}>
                                    <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                        <SelectTrigger className={cn(inputCls, 'w-full')}>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value} className="text-xs">
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* RIGHT — address + notes */}
                <div className="space-y-3">
                    <Section title="Address Details">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Field label="Street Address" error={errors.address}>
                                    <Input value={data.address ?? ''} onChange={(e) => setData('address', e.target.value)} placeholder="123 Rizal Avenue, Brgy. Poblacion" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="City" error={errors.city}>
                                <Input value={data.city ?? ''} onChange={(e) => setData('city', e.target.value)} placeholder="Makati City" className={inputCls} />
                            </Field>
                            <Field label="State / Province" error={errors.state}>
                                <Input value={data.state ?? ''} onChange={(e) => setData('state', e.target.value)} placeholder="Metro Manila" className={inputCls} />
                            </Field>
                            <Field label="Postal Code" error={errors.postal_code}>
                                <Input value={data.postal_code ?? ''} onChange={(e) => setData('postal_code', e.target.value)} placeholder="1200" className={inputCls} />
                            </Field>
                            <Field label="Country" error={errors.country}>
                                <Input value={data.country ?? 'Philippines'} onChange={(e) => setData('country', e.target.value)} placeholder="Philippines" className={inputCls} />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Notes & Save Actions">
                        <Field label="Notes & Customer Preferences" error={errors.notes}>
                            <textarea
                                value={data.notes ?? ''}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                className="w-full rounded-none border border-[#D1D5DB] bg-white px-2.5 py-2 text-xs font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                placeholder="Preferred printing method, special discounts, custom preferences…"
                            />
                        </Field>
                        <div className="mt-3 flex items-center gap-2">
                            <Button type="submit" disabled={processing} className="h-8 rounded-none bg-[#1A1C1E] px-4 text-xs font-normal text-white hover:bg-black flex-1">
                                {processing ? 'Saving…' : submitLabel}
                            </Button>
                            <Link href="/customers">
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

const EMPTY_CUSTOMER = {
    name: '',
    customer_code: '',
    email: '',
    phone: '',
    company: '',
    status: 'active',
    type: 'individual',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Philippines',
    notes: '',
    sort_order: 0,
};

export default function CreateCustomer() {
    const { data, setData, post, processing, errors } = useForm({ ...EMPTY_CUSTOMER });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/customers');
    };

    return (
        <>
            <Head title="Add new customer" />
            <CustomerForm
                data={data}
                setData={setData}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Create customer"
            />
        </>
    );
}

CreateCustomer.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Customers',
            href: '/customers',
        },
        {
            title: 'Create',
            href: '/customers/create',
        },
    ],
};
