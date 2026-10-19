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
    ArrowUpDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Cpu,
    Download,
    Eye,
    Mail,
    Pencil,
    Phone,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
} from 'lucide-react';
import { dashboard } from '@/routes';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

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
    updated_at: string;
}

interface StaffUser {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    avatar: string | null;
    created_at: string;
    updated_at: string;
    staff_profile: StaffProfile | null;
}

interface PaginatedStaff {
    data: StaffUser[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface RoleOption {
    value: string;
    label: string;
    badge: string;
    description: string;
}

interface StaffIndexProps {
    staff?: PaginatedStaff;
    filters?: {
        filter?: {
            search?: string;
            role?: string;
            department?: string;
            shift?: string;
            workstation?: string;
            is_active?: string;
        };
        sort?: string;
        per_page?: number;
    } | Record<string, any>;
    stats?: {
        total: number;
        active: number;
        inactive: number;
        operators: number;
        prepress: number;
        qc: number;
        managers: number;
    };
    departments?: string[];
    roles?: RoleOption[];
    shifts?: string[];
    workstations?: string[];
    nextEmployeeId?: string;
}

const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: '-name', label: 'Name (Z-A)' },
    { value: 'role', label: 'Role' },
];

export default function StaffIndex({
    staff = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 },
    filters = {},
    stats = { total: 0, active: 0, inactive: 0, operators: 0, prepress: 0, qc: 0, managers: 0 },
    departments = [],
    roles = [],
    shifts = [],
    workstations = [],
    nextEmployeeId = '',
}: StaffIndexProps) {
    const pageProps = usePage().props as unknown as { auth?: { user?: { id: number; role?: string } } };
    const currentUserId = pageProps.auth?.user?.id;
    const currentUserRole = pageProps.auth?.user?.role;
    const canDelete = currentUserRole !== 'staff';

    const safeFilters = (filters && !Array.isArray(filters) && typeof filters === 'object') ? filters : {};
    const initialFilter = (typeof safeFilters.filter === 'object' && safeFilters.filter !== null && !Array.isArray(safeFilters.filter))
        ? (safeFilters.filter as Record<string, any>)
        : {};

    const [search, setSearch] = useState<string>(typeof initialFilter.search === 'string' ? initialFilter.search : '');
    const [roleFilter, setRoleFilter] = useState<string>(typeof initialFilter.role === 'string' ? initialFilter.role : 'all');
    const [departmentFilter, setDepartmentFilter] = useState<string>(typeof initialFilter.department === 'string' ? initialFilter.department : 'all');
    const [shiftFilter, setShiftFilter] = useState<string>(typeof initialFilter.shift === 'string' ? initialFilter.shift : 'all');
    const [workstationFilter, setWorkstationFilter] = useState<string>(typeof initialFilter.workstation === 'string' ? initialFilter.workstation : 'all');
    const [statusFilter, setStatusFilter] = useState<string>(
        initialFilter.is_active !== undefined ? String(initialFilter.is_active) : 'all'
    );
    const initialSort = typeof safeFilters.sort === 'string' && safeFilters.sort ? safeFilters.sort : '-created_at';
    const [sort, setSort] = useState<string>(initialSort);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [viewingStaff, setViewingStaff] = useState<StaffUser | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);

    const rows = Array.isArray(staff?.data) ? staff.data : [];

    const toggleSelectAll = () => {
        if (selectedIds.length === rows.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(rows.map((r) => r.id));
        }
    };

    const toggleSelectRow = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const applyFilters = () => {
        const filter: Record<string, string> = {};
        if (search.trim()) filter.search = search.trim();
        if (roleFilter !== 'all') filter.role = roleFilter;
        if (departmentFilter !== 'all') filter.department = departmentFilter;
        if (shiftFilter !== 'all') filter.shift = shiftFilter;
        if (workstationFilter !== 'all') filter.workstation = workstationFilter;
        if (statusFilter !== 'all') filter.is_active = statusFilter;

        router.get(
            '/staff',
            { filter, sort, per_page: staff?.per_page ?? 10 },
            { preserveState: true }
        );
    };

    const resetFilters = () => {
        setSearch('');
        setRoleFilter('all');
        setDepartmentFilter('all');
        setShiftFilter('all');
        setWorkstationFilter('all');
        setStatusFilter('all');
        setSort('-created_at');
        router.get('/staff', {}, { preserveState: true });
    };

    const handleSortChange = (newSort: string) => {
        setSort(newSort);
        const filter: Record<string, string> = {};
        if (search.trim()) filter.search = search.trim();
        if (roleFilter !== 'all') filter.role = roleFilter;
        if (departmentFilter !== 'all') filter.department = departmentFilter;
        if (shiftFilter !== 'all') filter.shift = shiftFilter;
        if (workstationFilter !== 'all') filter.workstation = workstationFilter;
        if (statusFilter !== 'all') filter.is_active = statusFilter;

        router.get(
            '/staff',
            { filter, sort: newSort, per_page: staff?.per_page ?? 10 },
            { preserveState: true }
        );
    };

    const handleToggleStatus = (member: StaffUser) => {
        if (member.id === currentUserId) {
            alert('You cannot deactivate your own administrative account.');
            return;
        }
        router.post(`/staff/${member.id}/toggle-status`, {}, { preserveScroll: true });
    };

    const confirmDelete = (member: StaffUser) => {
        if (!canDelete) {
            alert('Staff members are not authorized to delete records.');
            return;
        }
        if (member.id === currentUserId) {
            alert('You cannot delete your own administrative account.');
            return;
        }
        if (!confirm(`Are you sure you want to remove staff member "${member.name}" (${member.staff_profile?.employee_id ?? member.username})?`)) {
            return;
        }
        setIsDeleting(true);
        router.delete(`/staff/${member.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                if (viewingStaff?.id === member.id) setViewingStaff(null);
            },
        });
    };

    const bulkActivate = () => {
        if (selectedIds.length === 0) return;
        setBulkProcessing(true);
        router.post('/staff/bulk-activate', { ids: selectedIds }, {
            onFinish: () => {
                setBulkProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const bulkDeactivate = () => {
        if (selectedIds.length === 0) return;
        const safeIds = selectedIds.filter((id) => id !== currentUserId);
        if (safeIds.length === 0) {
            alert('Cannot deactivate your own account.');
            return;
        }
        setBulkProcessing(true);
        router.post('/staff/bulk-deactivate', { ids: safeIds }, {
            onFinish: () => {
                setBulkProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const bulkDelete = () => {
        if (!canDelete) {
            alert('Staff members are not authorized to delete records.');
            return;
        }
        if (selectedIds.length === 0) return;
        const safeIds = selectedIds.filter((id) => id !== currentUserId);
        if (safeIds.length === 0) {
            alert('Cannot delete your own account.');
            return;
        }
        if (!confirm(`Are you sure you want to permanently delete ${safeIds.length} staff member(s)?`)) return;
        setBulkProcessing(true);
        router.post('/staff/bulk-destroy', { ids: safeIds }, {
            onFinish: () => {
                setBulkProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const exportCsv = () => {
        const targetData = selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
        if (!targetData || targetData.length === 0) {
            alert('No staff records available to export.');
            return;
        }

        const headers = [
            'ID',
            'Employee ID',
            'Name',
            'Username',
            'Email',
            'Role',
            'Department',
            'Position',
            'Workstation',
            'Shift',
            'Phone',
            'Emergency Contact',
            'Status',
            'Hire Date',
            'Created At',
        ];
        const csvRows = [headers.join(',')];

        targetData.forEach((item) => {
            const p = item.staff_profile;
            const row = [
                item.id,
                `"${(p?.employee_id || item.username || '').replace(/"/g, '""')}"`,
                `"${(item.name || '').replace(/"/g, '""')}"`,
                `"${(item.username || '').replace(/"/g, '""')}"`,
                `"${(item.email || '').replace(/"/g, '""')}"`,
                `"${(item.role || '').replace(/"/g, '""')}"`,
                `"${(p?.department || '').replace(/"/g, '""')}"`,
                `"${(p?.position || '').replace(/"/g, '""')}"`,
                `"${(p?.workstation || '').replace(/"/g, '""')}"`,
                `"${(p?.shift || '').replace(/"/g, '""')}"`,
                `"${(p?.phone || '').replace(/"/g, '""')}"`,
                `"${(p?.emergency_contact || '').replace(/"/g, '""')}"`,
                item.is_active ? 'Active' : 'Inactive',
                `"${p?.hire_date || ''}"`,
                `"${item.created_at || ''}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `staff_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getInitials = (name?: string | null) => {
        if (!name || typeof name !== 'string') return 'ST';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'ST';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '—';
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return dateString;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const getRoleLabel = (role: string) => {
        const found = roles.find((r) => r.value === role);
        return found ? found.label : role.replace('_', ' ').toUpperCase();
    };

    return (
        <>
            <Head title="Staff Management" />

            <div className="flex flex-col gap-2.5 font-sans text-[#1A1C1E]">
                {/* HEADING SECTION */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
                    <div className="max-w-[640px]">
                        <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                            Staff Management <span className="font-mono text-xs font-normal text-muted-foreground">({(staff?.total ?? 0).toLocaleString()})</span>
                        </h1>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Compressed high-density personnel registry with employee IDs, departmental positions, workstations, shift schedules, and access controls.
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={exportCsv}
                            size="sm"
                            className="h-7 rounded-none border-[#D1D5DB] px-2.5 text-[11px] font-normal text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                        >
                            <Download size={12} className="mr-1" /> Export CSV
                        </Button>
                        <Link href="/staff/create">
                            <Button size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white hover:bg-black">
                                <Plus size={12} className="mr-1" /> Add Staff Member
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-xs overflow-x-auto">
                    <button
                        type="button"
                        onClick={resetFilters}
                        className={`pb-1 shrink-0 ${statusFilter === 'all' && roleFilter === 'all' && departmentFilter === 'all' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        All Personnel ({(staff?.total ?? 0).toLocaleString()})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('1');
                            setRoleFilter('all');
                            setDepartmentFilter('all');
                            router.get('/staff', { filter: { is_active: '1' }, sort, per_page: staff?.per_page ?? 10 }, { preserveState: true });
                        }}
                        className={`pb-1 shrink-0 ${statusFilter === '1' && roleFilter === 'all' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        Active On Duty ({stats.active})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setRoleFilter('operator');
                            setStatusFilter('all');
                            router.get('/staff', { filter: { role: 'operator' }, sort, per_page: staff?.per_page ?? 10 }, { preserveState: true });
                        }}
                        className={`pb-1 shrink-0 ${roleFilter === 'operator' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        Operators ({stats.operators})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setRoleFilter('prepress_designer');
                            setStatusFilter('all');
                            router.get('/staff', { filter: { role: 'prepress_designer' }, sort, per_page: staff?.per_page ?? 10 }, { preserveState: true });
                        }}
                        className={`pb-1 shrink-0 ${roleFilter === 'prepress_designer' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        Prepress ({stats.prepress})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setRoleFilter('qc_lead');
                            setStatusFilter('all');
                            router.get('/staff', { filter: { role: 'qc_lead' }, sort, per_page: staff?.per_page ?? 10 }, { preserveState: true });
                        }}
                        className={`pb-1 shrink-0 ${roleFilter === 'qc_lead' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        QC Leads ({stats.qc})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => {
                            setRoleFilter('manager');
                            setStatusFilter('all');
                            router.get('/staff', { filter: { role: 'manager' }, sort, per_page: staff?.per_page ?? 10 }, { preserveState: true });
                        }}
                        className={`pb-1 shrink-0 ${roleFilter === 'manager' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        Management ({stats.managers})
                    </button>
                </div>

                {/* HEAVY DETAILED LINEAR FILTER BAR */}
                <div className="rounded-none border border-[#E5E7EB] bg-white p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Search Input */}
                        <div className="relative min-w-[220px] flex-1">
                            <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters();
                                }}
                                placeholder="Search name, ID badge, username, email, department, station..."
                                className="h-7 w-full rounded-none border-[#D1D5DB] pl-7 text-[11px] font-normal placeholder:text-[#8A8FA3]"
                            />
                        </div>

                        {/* Role Select */}
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="h-7 w-36 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="all" className="text-[11px]">All Roles</SelectItem>
                                {roles.map((r) => (
                                    <SelectItem key={r.value} value={r.value} className="text-[11px]">
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Department Select */}
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="h-7 w-44 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="all" className="text-[11px]">All Departments</SelectItem>
                                {departments.map((d) => (
                                    <SelectItem key={d} value={d} className="text-[11px]">
                                        {d}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Select */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-7 w-28 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="all" className="text-[11px]">All Status</SelectItem>
                                <SelectItem value="1" className="text-[11px]">Active</SelectItem>
                                <SelectItem value="0" className="text-[11px]">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Sort Order Select */}
                        <Select value={sort} onValueChange={handleSortChange}>
                            <SelectTrigger className="h-7 w-38 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <span className="flex items-center gap-1 truncate">
                                    <ArrowUpDown size={11} className="text-muted-foreground" />
                                    <SelectValue placeholder="Sort by" />
                                </span>
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {SORT_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Action buttons */}
                        <Button onClick={applyFilters} size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-3 text-[11px] font-normal text-white hover:bg-black">
                            Filter
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="h-7 rounded-none border border-[#E5E7EB] px-2 text-[11px] font-normal text-[#4A4E5A] hover:bg-[#F9FAFB]"
                        >
                            <SlidersHorizontal size={12} className="mr-1" />
                            {showAdvanced ? 'Hide Detailed' : 'Detailed Filters'}
                        </Button>

                        {(search || roleFilter !== 'all' || departmentFilter !== 'all' || shiftFilter !== 'all' || workstationFilter !== 'all' || statusFilter !== 'all' || sort !== '-created_at') && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={resetFilters}
                                className="h-7 rounded-none px-1.5 text-[11px] font-normal text-red-600 hover:bg-red-50"
                                title="Reset all filters"
                            >
                                <RotateCcw size={11} className="mr-1" /> Reset
                            </Button>
                        )}
                    </div>

                    {/* EXPANDABLE DETAILED LINEAR FILTERS */}
                    {showAdvanced && (
                        <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Shift:</span>
                                <Select value={shiftFilter} onValueChange={setShiftFilter}>
                                    <SelectTrigger className="h-6.5 w-full rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                        <SelectValue placeholder="All Shifts" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="all" className="text-[11px]">All Shifts</SelectItem>
                                        {shifts.map((s) => (
                                            <SelectItem key={s} value={s} className="text-[11px]">
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Workstation:</span>
                                <Select value={workstationFilter} onValueChange={setWorkstationFilter}>
                                    <SelectTrigger className="h-6.5 w-full rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                        <SelectValue placeholder="All Workstations" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="all" className="text-[11px]">All Workstations</SelectItem>
                                        {workstations.map((ws) => (
                                            <SelectItem key={ws} value={ws} className="text-[11px]">
                                                {ws}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-1 lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 text-[10px] text-[#6B7280]">
                                {nextEmployeeId && (
                                    <span className="font-mono text-[10px] text-[#6B7280]">
                                        Next Employee ID: <strong className="text-[#1A1C1E]">{nextEmployeeId}</strong>
                                    </span>
                                )}
                                <Button onClick={applyFilters} size="sm" className="h-6.5 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white">
                                    Apply Heavy Filters
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* BULK ACTION BAR */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-none border border-[#1A1C1E] bg-[#1A1C1E] px-2.5 py-1.5 text-white">
                        <span className="text-[11px] font-mono">
                            {selectedIds.length} staff member{selectedIds.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={exportCsv}
                                className="h-6 rounded-none border-white/20 bg-white/10 px-2 text-[10px] text-white hover:bg-white/20"
                            >
                                Export Selected
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={bulkActivate}
                                className="h-6 rounded-none border-emerald-500/50 bg-emerald-900/40 px-2 text-[10px] text-emerald-200 hover:bg-emerald-800/60"
                            >
                                Bulk Activate
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={bulkProcessing}
                                onClick={bulkDeactivate}
                                className="h-6 rounded-none border-amber-500/50 bg-amber-900/40 px-2 text-[10px] text-amber-200 hover:bg-amber-800/60"
                            >
                                Bulk Deactivate
                            </Button>
                            {canDelete && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={bulkProcessing}
                                    onClick={bulkDelete}
                                    className="h-6 rounded-none border-red-500/50 bg-red-900/40 px-2 text-[10px] text-red-200 hover:bg-red-800/60"
                                >
                                    Bulk Delete
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* COMPRESSED 10-COLUMN HIGH DENSITY PURE SQUARE TABLE */}
                <div className="rounded-none border border-[#E5E7EB] bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] font-mono uppercase tracking-wider text-[#4A4E5A]">
                                    <th className="w-8 px-2 py-2 text-center border-r border-[#E5E7EB]">
                                        <Checkbox
                                            checked={rows.length > 0 && selectedIds.length === rows.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Employee ID / Name</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Contact / Handle</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Role</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Department & Position</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Workstation</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Shift Schedule</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Status</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Hire Date</th>
                                    <th className="w-20 px-2 py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                                {rows.length > 0 ? (
                                    rows.map((member) => {
                                        const profile = member.staff_profile;
                                        const isCurrentUser = member.id === currentUserId;

                                        return (
                                            <tr
                                                key={member.id}
                                                className={`transition-colors hover:bg-[#F9FAFB] ${selectedIds.includes(member.id) ? 'bg-[#F3F4F6]' : ''}`}
                                            >
                                                {/* 1. Checkbox */}
                                                <td className="px-2 py-1.5 text-center border-r border-[#E5E7EB]">
                                                    <Checkbox
                                                        checked={selectedIds.includes(member.id)}
                                                        onCheckedChange={() => toggleSelectRow(member.id)}
                                                    />
                                                </td>

                                                {/* 2. Employee ID / Staff Name */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-[#1A1C1E] bg-[#1A1C1E] text-[9px] font-mono text-white">
                                                            {getInitials(member.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingStaff(member)}
                                                                    className="block truncate text-[11px] font-medium text-[#1A1C1E] hover:underline text-left"
                                                                >
                                                                    {member.name}
                                                                </button>
                                                                {isCurrentUser && (
                                                                    <span className="rounded-none bg-[#E5E7EB] px-1 py-0.2 text-[8.5px] font-mono font-bold text-[#4B5563]">
                                                                        YOU
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="font-mono text-[9.5px] text-[#6B7280]">
                                                                {profile?.employee_id ?? member.username}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 3. Contact / Handle */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 truncate text-[11px] text-[#1A1C1E]">
                                                            <Mail size={11} className="shrink-0 text-[#6B7280]" />
                                                            <span className="truncate">{member.email}</span>
                                                        </div>
                                                        {profile?.phone ? (
                                                            <div className="flex items-center gap-1 truncate text-[9.5px] font-mono text-[#6B7280]">
                                                                <Phone size={10} className="shrink-0 text-[#6B7280]" />
                                                                <span className="truncate">{profile.phone}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9.5px] text-[#8A8FA3] font-mono">@{member.username}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 4. Role */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <span className="inline-block rounded-none border border-[#D1D5DB] bg-white px-1.5 py-0.5 text-[9.5px] font-mono tracking-wider text-[#374151] uppercase">
                                                        {getRoleLabel(member.role)}
                                                    </span>
                                                </td>

                                                {/* 5. Department & Position */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="text-[11px] font-medium text-[#1A1C1E] truncate">
                                                        {profile?.department ?? 'General'}
                                                    </div>
                                                    <div className="text-[9.5px] text-[#6B7280] truncate font-mono">
                                                        {profile?.position ?? 'Staff'}
                                                    </div>
                                                </td>

                                                {/* 6. Workstation */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    {profile?.workstation ? (
                                                        <div className="flex items-center gap-1 text-[11px] text-[#1A1C1E] truncate">
                                                            <Cpu size={11} className="shrink-0 text-[#6B7280]" />
                                                            <span className="truncate">{profile.workstation}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-[#8A8FA3]">—</span>
                                                    )}
                                                </td>

                                                {/* 7. Shift Schedule */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="flex items-center gap-1 text-[10.5px] font-mono text-[#4A4E5A] truncate">
                                                        <Clock size={10} className="shrink-0 text-[#6B7280]" />
                                                        <span className="truncate">{profile?.shift ? profile.shift.split('(')[0].trim() : 'Regular'}</span>
                                                    </div>
                                                </td>

                                                {/* 8. Status */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(member)}
                                                        disabled={isCurrentUser}
                                                        className={`flex items-center justify-center gap-1.5 mx-auto ${isCurrentUser ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-80'}`}
                                                        title={isCurrentUser ? 'Cannot toggle your own status' : 'Click to toggle status'}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${
                                                                member.is_active ? 'bg-[#1A1C1E]' : 'bg-gray-300'
                                                            }`}
                                                        />
                                                        <span className="text-[10.5px] font-mono text-[#1A1C1E] uppercase">
                                                            {member.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </button>
                                                </td>

                                                {/* 9. Hire Date */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center font-mono text-[10px] text-[#6B7280]">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Calendar size={10} className="text-[#8A8FA3]" />
                                                        <span>{formatDate(profile?.hire_date ?? member.created_at)}</span>
                                                    </div>
                                                </td>

                                                {/* 10. Actions */}
                                                <td className="px-2 py-1.5 text-center">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setViewingStaff(member)}
                                                            className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB] hover:text-[#1A1C1E]"
                                                            title="Quick View"
                                                        >
                                                            <Eye size={12} />
                                                        </Button>
                                                        <Link href={`/staff/${member.id}/edit`}>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB] hover:text-[#1A1C1E]"
                                                                title="Edit Profile"
                                                            >
                                                                <Pencil size={12} />
                                                            </Button>
                                                        </Link>
                                                        {canDelete && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => confirmDelete(member)}
                                                                disabled={isCurrentUser || isDeleting}
                                                                className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                                                                title={isCurrentUser ? 'Cannot delete yourself' : 'Delete Member'}
                                                            >
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center">
                                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-none border border-[#D1D5DB] bg-[#F9FAFB]">
                                                <Users size={16} className="text-[#6B7280]" />
                                            </div>
                                            <p className="mt-2 text-xs font-mono text-[#1A1C1E]">NO STAFF MEMBERS FOUND</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Adjust filters or create a new staff record.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* CONSISTENT TABLE FOOTER / PAGINATION */}
                    <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1.5 text-[10.5px] font-normal text-[#1A1C1E]">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-muted-foreground">Rows per page:</span>
                            <Select
                                value={String(staff?.per_page ?? 10)}
                                onValueChange={(v) => router.get('/staff', { ...safeFilters, per_page: v }, { preserveState: true })}
                            >
                                <SelectTrigger className="h-6 w-[60px] rounded-none border-[#D1D5DB] text-[10px] font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="font-mono text-muted-foreground">
                                Showing {staff?.from ?? 0}-{staff?.to ?? 0} of {staff?.total ?? 0}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(staff?.current_page ?? 1) <= 1}
                                    onClick={() => router.get('/staff', { ...safeFilters, page: (staff?.current_page ?? 1) - 1 })}
                                >
                                    <ChevronLeft size={12} />
                                </Button>
                                <span className="px-1.5 font-mono text-[11px] text-foreground">
                                    {staff?.current_page ?? 1} / {staff?.last_page ?? 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(staff?.current_page ?? 1) >= (staff?.last_page ?? 1)}
                                    onClick={() => router.get('/staff', { ...safeFilters, page: (staff?.current_page ?? 1) + 1 })}
                                >
                                    <ChevronRight size={12} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUICK VIEW MODAL */}
                <Dialog open={viewingStaff !== null} onOpenChange={(open) => { if (!open) setViewingStaff(null); }}>
                    <DialogContent className="max-h-[90vh] w-full overflow-y-auto rounded-none border-[#1A1C1E] sm:max-w-[720px]">
                        {viewingStaff && (
                            <>
                                <DialogHeader className="border-b border-[#E5E7EB] pb-3">
                                    <DialogTitle className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-[#1A1C1E]">
                                        {viewingStaff.name}
                                        <span className="text-[11px] font-mono font-normal text-[#6B7280]">
                                            [{viewingStaff.staff_profile?.employee_id ?? viewingStaff.username}] · {getRoleLabel(viewingStaff.role).toUpperCase()} · {viewingStaff.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="grid items-start gap-3 sm:grid-cols-2 pt-2">
                                    {/* LEFT — Personnel & Account */}
                                    <div className="space-y-3">
                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Identity & Contact
                                            </h3>
                                            <dl className="grid gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Full Name</dt><dd className="font-medium text-[#1A1C1E]">{viewingStaff.name}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Employee ID</dt><dd className="font-mono text-[11px] text-[#1A1C1E]">{viewingStaff.staff_profile?.employee_id ?? '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Username</dt><dd className="font-mono text-[#1A1C1E]">@{viewingStaff.username}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Email</dt><dd className="font-mono text-[#1A1C1E]">{viewingStaff.email}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Phone</dt><dd className="font-mono text-[#1A1C1E]">{viewingStaff.staff_profile?.phone || '—'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Emergency Contact</dt><dd className="text-[#1A1C1E]">{viewingStaff.staff_profile?.emergency_contact || '—'}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                System Access & Notes
                                            </h3>
                                            <dl className="grid gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Status</dt><dd className="font-mono uppercase text-[#1A1C1E]">{viewingStaff.is_active ? 'Active' : 'Inactive'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">System Role</dt><dd className="font-mono uppercase text-[#1A1C1E]">{getRoleLabel(viewingStaff.role)}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Internal Notes</dt><dd className="leading-relaxed text-[#1A1C1E]">{viewingStaff.staff_profile?.notes || '—'}</dd></div>
                                            </dl>
                                        </section>
                                    </div>

                                    {/* RIGHT — Production Assignment & Schedule */}
                                    <div className="space-y-3">
                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Deployment & Floor Assignment
                                            </h3>
                                            <dl className="grid gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Department</dt><dd className="text-[#1A1C1E]">{viewingStaff.staff_profile?.department || 'General'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Position / Designation</dt><dd className="text-[#1A1C1E]">{viewingStaff.staff_profile?.position || 'Staff'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Workstation</dt><dd className="font-mono text-[#1A1C1E]">{viewingStaff.staff_profile?.workstation || 'Unassigned'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Shift Schedule</dt><dd className="font-mono text-[#1A1C1E]">{viewingStaff.staff_profile?.shift || 'Regular'}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Hire Date</dt><dd className="font-mono text-[#1A1C1E]">{formatDate(viewingStaff.staff_profile?.hire_date)}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3.5">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                Record Activity
                                            </h3>
                                            <dl className="grid grid-cols-2 gap-2 text-[12px]">
                                                <div><dt className="text-[#8A8FA3]">Registered On</dt><dd className="font-mono text-[#1A1C1E]">{formatDate(viewingStaff.created_at)}</dd></div>
                                                <div><dt className="text-[#8A8FA3]">Last Updated</dt><dd className="font-mono text-[#1A1C1E]">{formatDate(viewingStaff.updated_at)}</dd></div>
                                            </dl>
                                        </section>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 pt-2 border-t border-[#E5E7EB]">
                                    <Button variant="ghost" type="button" onClick={() => setViewingStaff(null)} className="rounded-none">
                                        Close
                                    </Button>
                                    {canDelete && (
                                        <Button
                                            variant="outline"
                                            type="button"
                                            className="rounded-none text-red-600 border-red-200"
                                            disabled={viewingStaff.id === currentUserId || isDeleting}
                                            onClick={() => confirmDelete(viewingStaff)}
                                        >
                                            {isDeleting ? 'Deleting…' : 'Delete'}
                                        </Button>
                                    )}
                                    <Link href={`/staff/${viewingStaff.id}/edit`}>
                                        <Button type="button" className="rounded-none bg-[#1A1C1E] text-white hover:bg-black">
                                            Edit Profile
                                        </Button>
                                    </Link>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

StaffIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Staff Management',
            href: '/staff',
        },
    ],
};
