import { Head, Link, useForm, usePage } from '@inertiajs/react';
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

export interface RoleOption {
    value: string;
    label: string;
    badge: string;
    description: string;
}

export interface StaffProfile {
    id: number;
    user_id: number;
    employee_id: string;
    department: string;
    position: string;
    workstation: string | null;
    shift: string | null;
    phone: string | null;
    emergency_contact: string | null;
    hire_date: string | null;
    is_active: boolean;
    notes: string | null;
}

export interface StaffUser {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    avatar: string | null;
    created_at: string;
    staff_profile: StaffProfile | null;
}

const DEFAULT_ROLES: RoleOption[] = [
    { value: 'admin', label: 'Administrator', badge: 'Admin', description: 'Full administrative access to governance, settings, catalog, and finances.' },
    { value: 'manager', label: 'Store Manager', badge: 'Manager', description: 'Supervises orders, inventory replenishment, catalog, and customer support.' },
    { value: 'staff', label: 'Staff (Cannot delete)', badge: 'Staff', description: 'Order fulfillment, packing, and support staff (deletion restricted).' },
    { value: 'prepress_designer', label: 'Graphic Designer', badge: 'Designer', description: 'Handles custom artwork, proofing, and digital media assets.' },
    { value: 'operator', label: 'Fulfillment Operator', badge: 'Operator', description: 'Processes packaging, shipping, and order dispatching.' },
    { value: 'qc_lead', label: 'Quality Inspector', badge: 'QC Lead', description: 'Performs order quality checks and packaging standards.' },
];

const DEFAULT_DEPARTMENTS = [
    'Management',
    'Sales & E-Commerce',
    'Order Fulfillment & Packing',
    'Inventory & Logistics',
    'Customer Support',
    'Graphic Design & Media',
    'Production & Printing',
    'Quality Assurance',
];

const DEFAULT_SHIFTS = [
    'Regular (8:00 AM - 5:00 PM)',
    'Morning (6:00 AM - 2:00 PM)',
    'Afternoon (2:00 PM - 10:00 PM)',
    'Night (10:00 PM - 6:00 AM)',
    'Flexible',
];

const DEFAULT_WORKSTATIONS = [
    'HQ Admin Console',
    'Order Processing Desk',
    'Packing Station #1',
    'Packing Station #2',
    'Dispatch Depot',
    'Inventory Counter',
    'Customer Service Bench',
    'Design Workstation',
];

const STATUSES = [
    { value: '1', label: 'Active', dot: 'bg-[#1A1C1E]' },
    { value: '0', label: 'Inactive', dot: 'bg-gray-400' },
];

const FIELD_LABELS: Record<string, string> = {
    name: 'Full name',
    username: 'Username',
    email: 'Official email',
    password: 'Password',
    password_confirmation: 'Password confirmation',
    role: 'Access role',
    is_active: 'Status',
    employee_id: 'Employee ID',
    department: 'Department',
    position: 'Position',
    workstation: 'Workstation',
    shift: 'Shift schedule',
    phone: 'Phone number',
    emergency_contact: 'Emergency contact',
    hire_date: 'Hire date',
    notes: 'Internal notes',
};

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

function generateEmployeeCode(role: string): string {
    const rolePrefix: Record<string, string> = {
        admin: 'ADM',
        manager: 'MGR',
        staff: 'STF',
        operator: 'OPS',
        prepress_designer: 'DSN',
        qc_lead: 'QCL',
    };
    const prefix = rolePrefix[role] ?? 'STF';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `EMP-${prefix}-${rand}`;
}

export function StaffForm({
    initial,
    onSubmit,
    processing,
    errors,
    setData,
    data,
    submitLabel,
    roles = DEFAULT_ROLES,
    departments = DEFAULT_DEPARTMENTS,
    shifts = DEFAULT_SHIFTS,
    workstations = DEFAULT_WORKSTATIONS,
    isCurrentUser = false,
    canDelete = true,
    onDelete,
}: {
    initial?: StaffUser | null;
    onSubmit: (e: FormEvent) => void;
    processing: boolean;
    errors: Record<string, string | undefined>;
    setData: (key: string, value: any) => void;
    data: any;
    submitLabel: string;
    roles?: RoleOption[];
    departments?: string[];
    shifts?: string[];
    workstations?: string[];
    isCurrentUser?: boolean;
    canDelete?: boolean;
    onDelete?: () => void;
}) {
    const errorBoxRef = useRef<HTMLDivElement>(null);
    const errorEntries = Object.entries((errors ?? {}) as Record<string, string>).filter(([, v]) => !!v);

    useEffect(() => {
        if (errorEntries.length > 0) errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errors]);

    const activeRoles = roles.length > 0 ? roles : DEFAULT_ROLES;
    const activeDepts = departments.length > 0 ? departments : DEFAULT_DEPARTMENTS;
    const activeShifts = shifts.length > 0 ? shifts : DEFAULT_SHIFTS;
    const activeStations = workstations.length > 0 ? workstations : DEFAULT_WORKSTATIONS;

    const getRoleLabel = (r: string) => {
        const found = activeRoles.find((item) => item.value === r);
        return found ? found.label : r.toUpperCase();
    };

    return (
        <form onSubmit={onSubmit} className="font-sans text-[#1A1C1E]">
            {/* HEADING SECTION MATCHING /CUSTOMERS */}
            <div className="mb-3 border-b border-[#E5E7EB] pb-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[15px] font-normal text-[#1A1C1E]">
                        {initial ? `Edit Staff Member` : 'Create Staff Member'}
                        {data.employee_id && (
                            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                [{data.employee_id}]
                            </span>
                        )}
                    </h2>
                    {data.role && (
                        <span className="rounded-none border border-[#D1D5DB] bg-white px-2 py-0.5 text-[10px] font-mono tracking-wider text-[#374151] uppercase">
                            {getRoleLabel(data.role)}
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                    {initial
                        ? 'Update staff user credentials, departmental role, shift schedule, workstation, and contact details.'
                        : 'Register user credentials, assign operational role, department, workstation, and shift schedule.'}
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
                {/* LEFT COLUMN: Credentials & Access */}
                <div className="space-y-3">
                    <Section title="Account Credentials & Role">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Field label="Full Name *" error={errors.name}>
                                    <Input
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g. Maria Santos"
                                        className={inputCls}
                                        required
                                    />
                                </Field>
                            </div>

                            <Field label="Employee ID / Badge" error={errors.employee_id}>
                                <div className="flex gap-1">
                                    <Input
                                        value={data.employee_id ?? ''}
                                        onChange={(e) => setData('employee_id', e.target.value)}
                                        placeholder="EMP-STF-1001"
                                        className={`${inputCls} flex-1 bg-[#F9FAFB] font-mono text-[11px]`}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 rounded-none border-[#D1D5DB] px-2 text-xs font-mono text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                                        onClick={() => setData('employee_id', generateEmployeeCode(data.role))}
                                        title="Regenerate Employee ID"
                                    >
                                        <RotateCcw size={12} />
                                    </Button>
                                </div>
                            </Field>

                            <Field label="Username / Handle *" error={errors.username}>
                                <Input
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                    placeholder="msantos"
                                    className={`${inputCls} font-mono text-[11px]`}
                                    required
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Official Email *" error={errors.email}>
                                    <Input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="msantos@company.com"
                                        className={inputCls}
                                        required
                                    />
                                </Field>
                            </div>

                            <Field label="Access Role *" error={errors.role}>
                                <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {activeRoles.map((r) => (
                                            <SelectItem key={r.value} value={r.value} className="text-xs">
                                                <span className="flex items-center justify-between gap-2">
                                                    <span>{r.label}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">[{r.badge}]</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Status *" error={errors.is_active}>
                                <Select
                                    value={data.is_active ? '1' : '0'}
                                    onValueChange={(v) => setData('is_active', v === '1')}
                                >
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

                            <Field label={initial ? 'New Password (Optional)' : 'Password *'} error={errors.password}>
                                <Input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder={initial ? 'Leave blank to keep' : 'Minimum 8 characters'}
                                    className={inputCls}
                                    required={!initial}
                                />
                            </Field>

                            <Field label={initial ? 'Confirm New Password' : 'Confirm Password *'} error={errors.password_confirmation}>
                                <Input
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="Re-type password"
                                    className={inputCls}
                                    required={!initial && Boolean(data.password)}
                                />
                            </Field>
                        </div>
                    </Section>
                </div>

                {/* RIGHT COLUMN: Operational Details & Actions */}
                <div className="space-y-3">
                    <Section title="Department & Assignment">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Department *" error={errors.department}>
                                <Select value={data.department} onValueChange={(v) => setData('department', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {activeDepts.map((d) => (
                                            <SelectItem key={d} value={d} className="text-xs">
                                                {d}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Position / Job Title *" error={errors.position}>
                                <Input
                                    value={data.position}
                                    onChange={(e) => setData('position', e.target.value)}
                                    placeholder="e.g. Order Fulfillment Specialist"
                                    className={inputCls}
                                    required
                                />
                            </Field>

                            <Field label="Assigned Workstation" error={errors.workstation}>
                                <Select value={data.workstation || 'none'} onValueChange={(v) => setData('workstation', v === 'none' ? '' : v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Workstation assignment" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="none" className="text-xs text-muted-foreground">Unassigned / Flexible</SelectItem>
                                        {activeStations.map((ws) => (
                                            <SelectItem key={ws} value={ws} className="text-xs">
                                                {ws}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Work Shift" error={errors.shift}>
                                <Select value={data.shift || activeShifts[0]} onValueChange={(v) => setData('shift', v)}>
                                    <SelectTrigger className={cn(inputCls, 'w-full')}>
                                        <SelectValue placeholder="Shift schedule" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {activeShifts.map((s) => (
                                            <SelectItem key={s} value={s} className="text-xs">
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Phone Number" error={errors.phone}>
                                <Input
                                    value={data.phone ?? ''}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="09171234567"
                                    className={inputCls}
                                />
                            </Field>

                            <Field label="Emergency Contact" error={errors.emergency_contact}>
                                <Input
                                    value={data.emergency_contact ?? ''}
                                    onChange={(e) => setData('emergency_contact', e.target.value)}
                                    placeholder="Name & Contact (e.g. Spouse 0918...)"
                                    className={inputCls}
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field label="Hire Date" error={errors.hire_date}>
                                    <Input
                                        type="date"
                                        value={data.hire_date ?? ''}
                                        onChange={(e) => setData('hire_date', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Notes & Save Actions">
                        <Field label="Internal Notes & Responsibilities" error={errors.notes}>
                            <textarea
                                value={data.notes ?? ''}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                className="w-full rounded-none border border-[#D1D5DB] bg-white px-2.5 py-2 text-xs font-normal text-[#1A1C1E] outline-none placeholder:text-[#8A8FA3] focus:border-[#1A1C1E]"
                                placeholder="Designated responsibilities, special permissions, notes…"
                            />
                        </Field>
                        <div className="mt-3 flex items-center gap-2">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-8 rounded-none bg-[#1A1C1E] px-4 text-xs font-normal text-white hover:bg-black flex-1"
                            >
                                {processing ? 'Saving…' : submitLabel}
                            </Button>
                            {initial && onDelete && canDelete && !isCurrentUser && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onDelete}
                                    className="h-8 rounded-none border-red-200 text-red-600 hover:bg-red-50 text-xs px-3"
                                >
                                    Delete
                                </Button>
                            )}
                            <Link href="/staff">
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="h-8 rounded-none border-[#D1D5DB] px-3 text-xs font-normal text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                                >
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

interface StaffCreateProps {
    departments?: string[];
    roles?: RoleOption[];
    shifts?: string[];
    workstations?: string[];
    nextEmployeeId?: string;
}

export default function CreateStaff({
    departments = DEFAULT_DEPARTMENTS,
    roles = DEFAULT_ROLES,
    shifts = DEFAULT_SHIFTS,
    workstations = DEFAULT_WORKSTATIONS,
    nextEmployeeId = '',
}: StaffCreateProps) {
    const today = new Date().toISOString().split('T')[0];
    const initialId = nextEmployeeId || generateEmployeeCode('staff');

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'staff',
        is_active: true,
        employee_id: initialId,
        department: departments[2] ?? 'Order Fulfillment & Packing',
        position: 'Order Fulfillment Staff',
        workstation: workstations[1] ?? 'Order Processing Desk',
        shift: shifts[0] ?? 'Regular (8:00 AM - 5:00 PM)',
        phone: '',
        emergency_contact: '',
        hire_date: today,
        notes: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/staff');
    };

    return (
        <>
            <Head title="Create Staff Member" />
            <StaffForm
                data={data}
                setData={setData}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Save & Provision Staff"
                roles={roles}
                departments={departments}
                shifts={shifts}
                workstations={workstations}
            />
        </>
    );
}

CreateStaff.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Staff Management',
            href: '/staff',
        },
        {
            title: 'Create',
            href: '/staff/create',
        },
    ],
};
