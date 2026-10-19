import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    Cpu,
    ListTodo,
    Mail,
    Pencil,
    Phone,
    Shield,
    ShieldAlert,
    User,
    UserCheck,
} from 'lucide-react';

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
}

interface StaffProfile {
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
    created_at: string;
}

interface StaffUser {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    staff_profile: StaffProfile | null;
    tasks?: Task[];
}

interface RoleOption {
    value: string;
    label: string;
    badge: string;
    description: string;
}

interface StaffShowProps {
    staff: StaffUser;
    roles: RoleOption[];
}

export default function StaffShow({ staff, roles = [] }: StaffShowProps) {
    const profile = staff.staff_profile;
    const tasks = staff.tasks ?? [];

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin':
            case 'superadmin':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'manager':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'operator':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'prepress_designer':
                return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            case 'qc_lead':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleLabel = (role: string) => {
        const found = roles.find((r) => r.value === role);
        return found ? found.label : role;
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'ST';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <>
            <Head title={`Staff: ${staff.name} - Nuyda Admin`} />

            <div className="mx-auto max-w-4xl space-y-6 font-sans text-[#1A1C1E]">
                {/* HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                    <div className="flex items-center gap-3">
                        <Link href="/staff">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-[#D1D5DB] text-[#4B5563] hover:text-[#1A1C1E]"
                            >
                                <ArrowLeft size={14} />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold tracking-tight text-[#1A1C1E]">
                                    {staff.name}
                                </h1>
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleColor(staff.role)}`}>
                                    {getRoleLabel(staff.role)}
                                </span>
                            </div>
                            <p className="text-xs text-[#6B7280]">
                                Employee Badge: <span className="font-mono font-semibold text-[#1A1C1E]">{profile?.employee_id ?? 'N/A'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/staff/${staff.id}/edit`}>
                            <Button size="sm" className="h-8 gap-1.5 bg-[#0052CC] text-xs font-semibold text-white hover:bg-[#0047B3]">
                                <Pencil size={13} />
                                Edit Profile
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* ID BADGE CARD */}
                    <div className="rounded-xl border border-[#D1D5DB] bg-gradient-to-b from-[#0052CC] to-[#00388F] p-5 text-white shadow-md md:col-span-1">
                        <div className="flex items-center justify-between border-b border-white/20 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-black text-xs text-[#0052CC]">
                                    N
                                </span>
                                <span className="font-extrabold text-xs tracking-wider uppercase">
                                    NUYDA ENTERPRISE
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-white/80">
                                {profile?.employee_id ?? 'STF-XXXX'}
                            </span>
                        </div>

                        <div className="mt-5 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-bold text-[#0052CC] shadow-inner">
                                {getInitials(staff.name)}
                            </div>
                            <h2 className="mt-3 font-bold text-base">{staff.name}</h2>
                            <p className="text-xs text-white/75">@{staff.username}</p>
                            <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                {getRoleLabel(staff.role)}
                            </span>
                        </div>

                        <div className="mt-5 space-y-2 rounded-lg bg-black/25 p-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-white/60">Department:</span>
                                <span className="font-medium text-white">{profile?.department ?? 'General'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Position:</span>
                                <span className="font-medium text-white">{profile?.position ?? 'Staff'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Station:</span>
                                <span className="font-medium text-white">{profile?.workstation ?? 'HQ Admin'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Shift:</span>
                                <span className="font-medium text-white">{profile?.shift?.split('(')[0] ?? 'Regular'}</span>
                            </div>
                        </div>

                        <div className="mt-4 text-center text-[10px] text-white/75">
                            Status: {staff.is_active ? '● Active On-Duty' : '○ Inactive Account'}
                        </div>
                    </div>

                    {/* METADATA & TASKS */}
                    <div className="space-y-6 md:col-span-2">
                        {/* CONTACT & WORK INFORMATION */}
                        <div className="rounded-xl border border-[#E9EBF3] bg-white p-5 shadow-xs">
                            <h3 className="border-b border-[#E9EBF3] pb-2.5 text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                                Personnel & Station Details
                            </h3>

                            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-[#6B7280]">Official Email:</span>
                                    <p className="mt-0.5 font-medium text-[#1A1C1E]">{staff.email}</p>
                                </div>
                                <div>
                                    <span className="text-[#6B7280]">Contact Number:</span>
                                    <p className="mt-0.5 font-medium text-[#1A1C1E]">{profile?.phone ?? '—'}</p>
                                </div>
                                <div>
                                    <span className="text-[#6B7280]">Emergency Contact:</span>
                                    <p className="mt-0.5 font-medium text-[#1A1C1E]">{profile?.emergency_contact ?? '—'}</p>
                                </div>
                                <div>
                                    <span className="text-[#6B7280]">Employment Date:</span>
                                    <p className="mt-0.5 font-medium text-[#1A1C1E]">{profile?.hire_date ?? '—'}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[#6B7280]">Shift Schedule:</span>
                                    <p className="mt-0.5 font-medium text-[#1A1C1E]">{profile?.shift ?? 'Regular (8:00 AM - 5:00 PM)'}</p>
                                </div>
                                {profile?.notes && (
                                    <div className="col-span-2 rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-amber-800">
                                        <span className="font-semibold">Operator Notes:</span> {profile.notes}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ASSIGNED TASKS */}
                        <div className="rounded-xl border border-[#E9EBF3] bg-white p-5 shadow-xs">
                            <div className="flex items-center justify-between border-b border-[#E9EBF3] pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                                    Operational Tasks & Directives ({tasks.length})
                                </h3>
                                <ListTodo size={14} className="text-[#0052CC]" />
                            </div>

                            <div className="mt-3">
                                {tasks.length === 0 ? (
                                    <p className="py-4 text-center text-xs text-[#9CA3AF]">
                                        No active tasks assigned to this staff member.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-[#E9EBF3] text-xs">
                                        {tasks.map((task) => (
                                            <li key={task.id} className="py-2.5 flex items-center justify-between">
                                                <div>
                                                    <span className="font-semibold text-[#1A1C1E]">{task.title}</span>
                                                    {task.description && (
                                                        <p className="text-[11px] text-[#6B7280]">{task.description}</p>
                                                    )}
                                                </div>
                                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize">
                                                    {task.status}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
