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
    AlertTriangle,
    Archive,
    ArchiveRestore,
    ArrowUpDown,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Eye,
    Laptop,
    Redo2,
    RotateCcw,
    RotateCw,
    Search,
    Shield,
    SlidersHorizontal,
    Trash2,
    Undo2,
    User as UserIcon,
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

export interface AuditLogRow {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    user_role: string | null;
    action: string;
    module: string;
    description: string;
    entity_type: string | null;
    entity_id: string | number | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    severity: 'info' | 'success' | 'warning' | 'critical' | string;
    is_undone: boolean;
    undone_at: string | null;
    undone_by_id: number | null;
    deleted_at: string | null;
    can_undo: boolean;
    can_redo: boolean;
    created_at: string;
    updated_at?: string;
    user?: {
        id: number;
        name: string;
        username: string;
        email: string;
        role: string;
        avatar?: string | null;
    } | null;
    undone_by?: {
        id: number;
        name: string;
        email: string;
        role: string;
    } | null;
}

interface PaginatedLogs {
    data: AuditLogRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Stats {
    total: number;
    archived: number;
    undone: number;
    today: number;
    critical: number;
    auth: number;
    orders: number;
    staff: number;
    products?: number;
    customers?: number;
    inventory?: number;
    printing?: number;
}

const DEFAULT_MODULES = [
    'Auth',
    'Orders',
    'Products',
    'Customers',
    'Printing',
    'Inventory',
    'Staff',
    'Discounts',
    'Rewards',
    'System',
];

const SEVERITY_OPTIONS = [
    { value: 'all', label: 'All Severities' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active Logs' },
    { value: 'archived', label: 'Archived Only' },
    { value: 'all_with_archived', label: 'All (Inc. Archived)' },
];

const STATE_OPTIONS = [
    { value: 'all', label: 'All Changes' },
    { value: 'active_delta', label: 'Applied Changes' },
    { value: 'undone', label: 'Undone / Reverted' },
];

const SORT_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'action', label: 'Action (A-Z)' },
    { value: 'module', label: 'Module (A-Z)' },
    { value: 'severity', label: 'Severity' },
    { value: 'user_name', label: 'Actor Name (A-Z)' },
];

export default function AuditLogsIndex({
    logs = { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0, from: 0, to: 0 } as PaginatedLogs,
    filters = {},
    stats = { total: 0, archived: 0, undone: 0, today: 0, critical: 0, auth: 0, orders: 0, staff: 0 },
    modules = DEFAULT_MODULES,
}: {
    logs?: PaginatedLogs;
    filters?: Record<string, unknown>;
    stats?: Stats;
    modules?: string[];
    severities?: string[];
}) {
    const pageProps = usePage().props as unknown as {
        auth?: { user?: { id: number; name: string; role: string } };
        flash?: { success?: string; error?: string };
    };

    const currentUser = pageProps.auth?.user;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    const rows = Array.isArray(logs?.data) ? logs.data : [];

    const initialFilter = (typeof filters?.filter === 'object' && filters?.filter !== null
        ? filters.filter
        : {}) as Record<string, string>;

    const initialSort = typeof filters?.sort === 'string' && filters.sort ? filters.sort : '-created_at';

    const [search, setSearch] = useState<string>(typeof initialFilter.search === 'string' ? initialFilter.search : '');
    const [selectedModule, setSelectedModule] = useState<string>(typeof initialFilter.module === 'string' ? initialFilter.module : 'all');
    const [selectedSeverity, setSelectedSeverity] = useState<string>(typeof initialFilter.severity === 'string' ? initialFilter.severity : 'all');
    const [selectedStatus, setSelectedStatus] = useState<string>(typeof initialFilter.status === 'string' ? initialFilter.status : 'active');
    const [selectedState, setSelectedState] = useState<string>(typeof initialFilter.state === 'string' ? initialFilter.state : 'all');
    const [dateFrom, setDateFrom] = useState<string>(typeof initialFilter.date_from === 'string' ? initialFilter.date_from : '');
    const [dateTo, setDateTo] = useState<string>(typeof initialFilter.date_to === 'string' ? initialFilter.date_to : '');
    const [sort, setSort] = useState<string>(initialSort);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(Boolean(initialFilter.date_from || initialFilter.date_to || initialFilter.state));

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [viewId, setViewId] = useState<number | null>(null);
    const [purgeDialogOpen, setPurgeDialogOpen] = useState<boolean>(false);
    const [purgeDays, setPurgeDays] = useState<string>('90');
    const [purging, setPurging] = useState<boolean>(false);
    const [processingAction, setProcessingAction] = useState<boolean>(false);
    const [copiedJson, setCopiedJson] = useState<boolean>(false);

    const viewing = rows.find((l) => l && l.id === viewId) ?? null;

    const closeView = () => {
        setViewId(null);
        setCopiedJson(false);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === rows.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(rows.map((r) => r.id));
        }
    };

    const toggleSelectRow = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const applyFilters = (customOverrides: Record<string, string> = {}) => {
        const filter: Record<string, string> = {};

        const s = customOverrides.search !== undefined ? customOverrides.search : search;
        const m = customOverrides.module !== undefined ? customOverrides.module : selectedModule;
        const sev = customOverrides.severity !== undefined ? customOverrides.severity : selectedSeverity;
        const stat = customOverrides.status !== undefined ? customOverrides.status : selectedStatus;
        const st = customOverrides.state !== undefined ? customOverrides.state : selectedState;
        const df = customOverrides.date_from !== undefined ? customOverrides.date_from : dateFrom;
        const dt = customOverrides.date_to !== undefined ? customOverrides.date_to : dateTo;

        if (s.trim()) filter.search = s.trim();
        if (m !== 'all') filter.module = m;
        if (sev !== 'all') filter.severity = sev;
        if (stat !== 'active') filter.status = stat;
        if (st !== 'all') filter.state = st;
        if (df) filter.date_from = df;
        if (dt) filter.date_to = dt;

        router.get(
            '/audit-logs',
            { filter, sort, per_page: logs?.per_page ?? 25 },
            { preserveState: true }
        );
    };

    const resetFilters = () => {
        setSearch('');
        setSelectedModule('all');
        setSelectedSeverity('all');
        setSelectedStatus('active');
        setSelectedState('all');
        setDateFrom('');
        setDateTo('');
        setSort('-created_at');
        router.get('/audit-logs', {}, { preserveState: true });
    };

    const setQuickTab = (
        tab: 'active' | 'auth' | 'orders' | 'products' | 'customers' | 'printing' | 'staff' | 'critical' | 'undone' | 'archived'
    ) => {
        if (tab === 'active') {
            resetFilters();
            return;
        }
        if (tab === 'auth') {
            setSelectedModule('Auth');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'Auth', severity: 'all', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'orders') {
            setSelectedModule('Orders');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'Orders', severity: 'all', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'products') {
            setSelectedModule('Products');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'Products', severity: 'all', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'customers') {
            setSelectedModule('Customers');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'Customers', severity: 'all', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'printing') {
            setSelectedModule('Printing');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'Printing', severity: 'all', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'staff') {
            setSelectedModule('Staff');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'Staff', severity: 'all', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'critical') {
            setSelectedModule('all');
            setSelectedSeverity('critical');
            setSelectedStatus('active');
            setSelectedState('all');
            applyFilters({ module: 'all', severity: 'critical', status: 'active', state: 'all' });
            return;
        }
        if (tab === 'undone') {
            setSelectedModule('all');
            setSelectedSeverity('all');
            setSelectedStatus('active');
            setSelectedState('undone');
            applyFilters({ module: 'all', severity: 'all', status: 'active', state: 'undone' });
            return;
        }
        if (tab === 'archived') {
            setSelectedModule('all');
            setSelectedSeverity('all');
            setSelectedStatus('archived');
            setSelectedState('all');
            applyFilters({ module: 'all', severity: 'all', status: 'archived', state: 'all' });
            return;
        }
    };

    // --- UNDO & REDO HANDLERS ---
    const handleUndo = (log: AuditLogRow) => {
        if (!confirm(`Revert and undo action [${log.action}] on ${log.entity_type ? log.entity_type.split('\\').pop() : 'entity'} #${log.entity_id}?`)) {
            return;
        }
        setProcessingAction(true);
        router.post(`/audit-logs/${log.id}/undo`, {}, {
            preserveScroll: true,
            onFinish: () => setProcessingAction(false),
        });
    };

    const handleRedo = (log: AuditLogRow) => {
        if (!confirm(`Re-apply and redo action [${log.action}] on ${log.entity_type ? log.entity_type.split('\\').pop() : 'entity'} #${log.entity_id}?`)) {
            return;
        }
        setProcessingAction(true);
        router.post(`/audit-logs/${log.id}/redo`, {}, {
            preserveScroll: true,
            onFinish: () => setProcessingAction(false),
        });
    };

    // --- ARCHIVE & RESTORE HANDLERS (No actual delete) ---
    const handleArchiveLog = (id: number) => {
        if (!confirm(`Archive audit log record #${id}? (No data is permanently deleted; logs can be restored/undone at any time)`)) {
            return;
        }
        setProcessingAction(true);
        router.post(`/audit-logs/${id}/archive`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(false);
                if (viewId === id) setViewId(null);
            },
        });
    };

    const handleRestoreLog = (id: number) => {
        setProcessingAction(true);
        router.post(`/audit-logs/${id}/restore`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(false);
                if (viewId === id) setViewId(null);
            },
        });
    };

    const handleBulkArchive = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Archive ${selectedIds.length} audit log record(s)? They will be moved to the archive without deleting any data.`)) {
            return;
        }
        setProcessingAction(true);
        router.post('/audit-logs/bulk-archive', { ids: selectedIds }, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(false);
                setSelectedIds([]);
            },
        });
    };

    const handleBulkRestore = () => {
        if (selectedIds.length === 0) return;
        setProcessingAction(true);
        router.post('/audit-logs/bulk-restore', { ids: selectedIds }, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(false);
                setSelectedIds([]);
            },
        });
    };

    const handlePurge = () => {
        if (!confirm(`Archive historical audit logs older than ${purgeDays} days? Logs will be archived safely without any hard deletion.`)) {
            return;
        }
        setPurging(true);
        router.post(
            '/audit-logs/purge',
            { days: Number(purgeDays) },
            {
                onFinish: () => {
                    setPurging(false);
                    setPurgeDialogOpen(false);
                },
            }
        );
    };

    const exportCsv = () => {
        const targetData = selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
        if (!targetData || targetData.length === 0) {
            alert('No audit logs available to export.');
            return;
        }

        const headers = [
            'ID',
            'Timestamp',
            'Actor Name',
            'Actor Email',
            'Actor Role',
            'Action',
            'Module',
            'Description',
            'Severity',
            'Status',
            'Is Undone',
            'Entity Type',
            'Entity ID',
            'IP Address',
            'User Agent',
        ];

        const csvRows = [headers.join(',')];

        targetData.forEach((item) => {
            const row = [
                item.id,
                `"${item.created_at || ''}"`,
                `"${(item.user_name || item.user?.name || 'System').replace(/"/g, '""')}"`,
                `"${item.user_email || item.user?.email || ''}"`,
                `"${item.user_role || item.user?.role || 'system'}"`,
                `"${item.action || ''}"`,
                `"${item.module || ''}"`,
                `"${(item.description || '').replace(/"/g, '""')}"`,
                `"${item.severity || 'info'}"`,
                `"${item.deleted_at ? 'Archived' : 'Active'}"`,
                item.is_undone ? 'YES' : 'NO',
                `"${item.entity_type || ''}"`,
                `"${item.entity_id || ''}"`,
                `"${item.ip_address || ''}"`,
                `"${(item.user_agent || '').replace(/"/g, '""')}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyEventJson = () => {
        if (!viewing) return;
        navigator.clipboard.writeText(JSON.stringify(viewing, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    const formatTimestamp = (dateString?: string): { date: string; time: string } => {
        if (!dateString) return { date: '—', time: '' };
        try {
            const d = new Date(dateString);
            return {
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
            };
        } catch {
            return { date: dateString, time: '' };
        }
    };

    const getActorInitials = (name?: string | null) => {
        if (!name || typeof name !== 'string') return 'SYS';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'SYS';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getSeverityDot = (sev?: string) => {
        switch (sev?.toLowerCase()) {
            case 'critical':
                return 'bg-rose-600 ring-rose-200';
            case 'warning':
                return 'bg-amber-500 ring-amber-200';
            case 'success':
                return 'bg-emerald-600 ring-emerald-200';
            default:
                return 'bg-[#1A1C1E] ring-gray-300';
        }
    };

    const isFilterActive =
        Boolean(search) ||
        selectedModule !== 'all' ||
        selectedSeverity !== 'all' ||
        selectedStatus !== 'active' ||
        selectedState !== 'all' ||
        Boolean(dateFrom) ||
        Boolean(dateTo) ||
        sort !== '-created_at';

    const isArchivedView = selectedStatus === 'archived';

    return (
        <>
            <Head title="Audit Logs" />

            <div className="flex flex-col gap-2.5 font-sans text-[#1A1C1E]">
                {/* HEADING SECTION */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
                    <div className="max-w-[680px]">
                        <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E] flex items-center gap-2">
                            <Shield size={16} className="text-[#1A1C1E]" />
                            Audit Logs & State Ledger{' '}
                            <span className="font-mono text-xs font-normal text-muted-foreground">
                                ({(logs?.total ?? 0).toLocaleString()})
                            </span>
                            {isArchivedView && (
                                <span className="rounded-none border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-mono text-amber-800 uppercase">
                                    Archive View
                                </span>
                            )}
                        </h1>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Immutable administrative compliance records with <strong>reversible state undo & redo</strong> and zero hard data loss (soft-archived ledger).
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        {isAdmin && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPurgeDialogOpen(true)}
                                size="sm"
                                className="h-7 rounded-none border-[#D1D5DB] px-2.5 text-[11px] font-normal text-amber-800 bg-white hover:bg-amber-50 hover:border-amber-300"
                            >
                                <Archive size={12} className="mr-1" /> Archive Retention
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={exportCsv}
                            size="sm"
                            className="h-7 rounded-none border-[#D1D5DB] px-2.5 text-[11px] font-normal text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                        >
                            <Download size={12} className="mr-1" /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 font-mono text-xs overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setQuickTab('active')}
                        className={`pb-1 shrink-0 ${
                            selectedStatus === 'active' && selectedModule === 'all' && selectedSeverity === 'all' && selectedState === 'all'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Active Logs ({(stats?.total ?? logs?.total ?? 0).toLocaleString()})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('auth')}
                        className={`pb-1 shrink-0 ${
                            selectedModule === 'Auth'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Auth ({stats?.auth ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('orders')}
                        className={`pb-1 shrink-0 ${
                            selectedModule === 'Orders'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Orders & Sales ({stats?.orders ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('products')}
                        className={`pb-1 shrink-0 ${
                            selectedModule === 'Products'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Products ({stats?.products ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('customers')}
                        className={`pb-1 shrink-0 ${
                            selectedModule === 'Customers'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Customers ({stats?.customers ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('printing')}
                        className={`pb-1 shrink-0 ${
                            selectedModule === 'Printing'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Printing & Stock ({(stats?.printing ?? 0) + (stats?.inventory ?? 0)})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('staff')}
                        className={`pb-1 shrink-0 ${
                            selectedModule === 'Staff'
                                ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Staff & System ({stats?.staff ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('critical')}
                        className={`pb-1 shrink-0 ${
                            selectedSeverity === 'critical'
                                ? 'border-b-2 border-rose-600 font-bold text-rose-700'
                                : 'text-[#6B7280] hover:text-rose-600'
                        }`}
                    >
                        Critical ({stats?.critical ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('undone')}
                        className={`pb-1 shrink-0 ${
                            selectedState === 'undone'
                                ? 'border-b-2 border-amber-600 font-bold text-amber-700'
                                : 'text-[#6B7280] hover:text-amber-600'
                        }`}
                    >
                        Undone Changes ({stats?.undone ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setQuickTab('archived')}
                        className={`pb-1 shrink-0 ${
                            selectedStatus === 'archived'
                                ? 'border-b-2 border-gray-900 font-bold text-gray-900 bg-gray-100 px-1.5'
                                : 'text-[#6B7280] hover:text-[#1A1C1E]'
                        }`}
                    >
                        Archived Logs ({stats?.archived ?? 0})
                    </button>
                </div>

                {/* HEAVY DETAILED LINEAR FILTER BAR */}
                <div className="rounded-none border border-[#E5E7EB] bg-white p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Search Input */}
                        <div className="relative min-w-[200px] flex-1">
                            <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters();
                                }}
                                placeholder="Search action, actor, description, IP, entity..."
                                className="h-7 w-full rounded-none border-[#D1D5DB] pl-7 text-[11px] font-normal placeholder:text-[#8A8FA3]"
                            />
                        </div>

                        {/* Status Select (Active / Archived) */}
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="h-7 w-36 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Archive Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Module Select */}
                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                            <SelectTrigger className="h-7 w-32 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="all" className="text-[11px]">
                                    All Modules
                                </SelectItem>
                                {modules.map((m) => (
                                    <SelectItem key={m} value={m} className="text-[11px]">
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Severity Select */}
                        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                            <SelectTrigger className="h-7 w-32 rounded-none border-[#D1D5DB] text-[11px] font-normal">
                                <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {SEVERITY_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Sort Select */}
                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] text-[11px] font-normal">
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
                        <Button
                            onClick={() => applyFilters()}
                            size="sm"
                            className="h-7 rounded-none bg-[#1A1C1E] px-3 text-[11px] font-normal text-white hover:bg-black"
                        >
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

                        {isFilterActive && (
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
                        <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-center">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">State Delta:</span>
                                <Select value={selectedState} onValueChange={setSelectedState}>
                                    <SelectTrigger className="h-6.5 rounded-none border-[#D1D5DB] text-[11px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {STATE_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Date From:</span>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-6.5 rounded-none border-[#D1D5DB] text-[11px] font-normal"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Date To:</span>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-6.5 rounded-none border-[#D1D5DB] text-[11px] font-normal"
                                />
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-2 text-[10px] text-[#6B7280]">
                                <span>Filter by date range and reversible state delta</span>
                                <Button
                                    onClick={() => applyFilters()}
                                    size="sm"
                                    className="h-6.5 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white"
                                >
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
                            {selectedIds.length} audit record{selectedIds.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={exportCsv}
                                className="h-6 rounded-none border-white/20 bg-white/10 px-2 text-[10px] text-white hover:bg-white/20"
                            >
                                Export Selected
                            </Button>
                            {isArchivedView ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={processingAction}
                                    onClick={handleBulkRestore}
                                    className="h-6 rounded-none border-emerald-500/50 bg-emerald-900/40 px-2 text-[10px] text-emerald-200 hover:bg-emerald-800/60"
                                >
                                    Restore / Unarchive Selected
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={processingAction}
                                    onClick={handleBulkArchive}
                                    className="h-6 rounded-none border-amber-500/50 bg-amber-900/40 px-2 text-[10px] text-amber-200 hover:bg-amber-800/60"
                                >
                                    Archive Selected (No Delete)
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedIds([])}
                                className="h-6 rounded-none px-2 text-[10px] text-white/70 hover:text-white"
                            >
                                Deselect All
                            </Button>
                        </div>
                    </div>
                )}

                {/* COMPRESSED HIGH DENSITY PURE SQUARE AUDIT TABLE */}
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
                                    <th className="w-32 px-2 py-2 border-r border-[#E5E7EB]">Timestamp / ID</th>
                                    <th className="w-44 px-2 py-2 border-r border-[#E5E7EB]">Actor / User</th>
                                    <th className="w-32 px-2 py-2 border-r border-[#E5E7EB]">Action</th>
                                    <th className="w-20 px-2 py-2 border-r border-[#E5E7EB]">Module</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Description / Delta</th>
                                    <th className="w-24 px-2 py-2 border-r border-[#E5E7EB]">State Delta</th>
                                    <th className="w-20 px-2 py-2 border-r border-[#E5E7EB]">Severity</th>
                                    <th className="w-24 px-2 py-2 border-r border-[#E5E7EB]">IP / Host</th>
                                    <th className="w-24 px-2 py-2 text-center">Undo / Redo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                                {rows.length > 0 ? (
                                    rows.map((log) => {
                                        const ts = formatTimestamp(log.created_at);
                                        const actorName = log.user_name || log.user?.name || 'System';
                                        const actorEmail = log.user_email || log.user?.email || 'system@placides.internal';
                                        const actorRole = log.user_role || log.user?.role || 'system';
                                        const isArchived = Boolean(log.deleted_at);

                                        return (
                                            <tr
                                                key={log.id}
                                                className={`transition-colors hover:bg-[#F9FAFB] ${
                                                    selectedIds.includes(log.id) ? 'bg-[#F3F4F6]' : ''
                                                } ${isArchived ? 'opacity-70 bg-[#FAFAFA]' : ''}`}
                                            >
                                                {/* 1. Checkbox */}
                                                <td className="px-2 py-1.5 text-center border-r border-[#E5E7EB]">
                                                    <Checkbox
                                                        checked={selectedIds.includes(log.id)}
                                                        onCheckedChange={() => toggleSelectRow(log.id)}
                                                    />
                                                </td>

                                                {/* 2. Timestamp / ID */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="font-mono text-[10px] text-[#1A1C1E] leading-tight">
                                                        <div>{ts.date}</div>
                                                        <div className="text-[#6B7280]">{ts.time}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 font-mono text-[9px] text-[#8A8FA3]">
                                                        <span>#{log.id}</span>
                                                        {isArchived && (
                                                            <span className="text-[8px] uppercase text-amber-700 bg-amber-50 px-1 border border-amber-200">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 3. Actor / User */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-[#1A1C1E] bg-[#1A1C1E] text-[9px] font-mono text-white">
                                                            {getActorInitials(actorName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="truncate font-medium text-[11px] text-[#1A1C1E]">
                                                                {actorName}
                                                            </div>
                                                            <div className="flex items-center gap-1 font-mono text-[9px] text-[#6B7280]">
                                                                <span className="truncate">{actorEmail}</span>
                                                                <span className="rounded-none border border-[#D1D5DB] bg-white px-1 py-0 text-[8.5px] uppercase">
                                                                    {actorRole}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 4. Action */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <span className="inline-block rounded-none border border-[#D1D5DB] bg-[#F9FAFB] px-1.5 py-0.5 text-[9.5px] font-mono tracking-tight text-[#1A1C1E]">
                                                        {log.action}
                                                    </span>
                                                </td>

                                                {/* 5. Module */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <span className="inline-block rounded-none border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-[#374151]">
                                                        {log.module}
                                                    </span>
                                                </td>

                                                {/* 6. Description */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewId(log.id)}
                                                        className={`text-left block text-[11px] hover:underline line-clamp-1 ${
                                                            log.is_undone ? 'line-through text-[#8A8FA3]' : 'text-[#1A1C1E]'
                                                        }`}
                                                        title={log.description}
                                                    >
                                                        {log.description}
                                                    </button>
                                                    {log.is_undone && (
                                                        <span className="font-mono text-[9px] text-amber-700 font-medium">
                                                            [Undone / Reverted]
                                                        </span>
                                                    )}
                                                </td>

                                                {/* 7. State Delta Badge */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    {log.is_undone ? (
                                                        <span className="inline-flex items-center gap-1 rounded-none border border-amber-300 bg-amber-50 px-1 py-0.5 text-[9px] font-mono text-amber-800">
                                                            <Undo2 size={10} /> Reverted
                                                        </span>
                                                    ) : log.can_undo ? (
                                                        <span className="inline-flex items-center gap-1 rounded-none border border-emerald-300 bg-emerald-50 px-1 py-0.5 text-[9px] font-mono text-emerald-800">
                                                            <CheckCircle2 size={10} /> Active Delta
                                                        </span>
                                                    ) : (
                                                        <span className="font-mono text-[9.5px] text-[#8A8FA3]">—</span>
                                                    )}
                                                </td>

                                                {/* 8. Severity */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ring-2 ${getSeverityDot(
                                                                log.severity
                                                            )}`}
                                                        />
                                                        <span className="font-mono text-[10px] uppercase text-[#1A1C1E]">
                                                            {log.severity || 'info'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* 9. IP / Host */}
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="font-mono text-[10px] text-[#1A1C1E]">
                                                        {log.ip_address || '127.0.0.1'}
                                                    </div>
                                                    {log.entity_type && (
                                                        <div className="font-mono text-[9px] text-[#8A8FA3] truncate" title={log.entity_type}>
                                                            {log.entity_type.split('\\').pop()} #{log.entity_id}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 10. Undo / Redo & Inspect Actions */}
                                                <td className="px-2 py-1.5 text-center">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {/* UNDO BUTTON */}
                                                        {log.can_undo && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={processingAction}
                                                                onClick={() => handleUndo(log)}
                                                                className="h-6 w-6 rounded-none p-0 text-amber-700 hover:bg-amber-100 hover:text-amber-900"
                                                                title="Undo / Revert this change"
                                                            >
                                                                <Undo2 size={12} />
                                                            </Button>
                                                        )}

                                                        {/* REDO BUTTON */}
                                                        {log.can_redo && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={processingAction}
                                                                onClick={() => handleRedo(log)}
                                                                className="h-6 w-6 rounded-none p-0 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
                                                                title="Redo / Reapply this change"
                                                            >
                                                                <Redo2 size={12} />
                                                            </Button>
                                                        )}

                                                        {/* ARCHIVE / RESTORE BUTTON (Soft delete, no actual delete) */}
                                                        {isArchived ? (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={processingAction}
                                                                onClick={() => handleRestoreLog(log.id)}
                                                                className="h-6 w-6 rounded-none p-0 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
                                                                title="Restore / Undo Archive"
                                                            >
                                                                <ArchiveRestore size={12} />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={processingAction}
                                                                onClick={() => handleArchiveLog(log.id)}
                                                                className="h-6 w-6 rounded-none p-0 text-[#6B7280] hover:bg-amber-50 hover:text-amber-800"
                                                                title="Archive log (No actual delete)"
                                                            >
                                                                <Archive size={12} />
                                                            </Button>
                                                        )}

                                                        {/* INSPECT EYE */}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setViewId(log.id)}
                                                            className="h-6 w-6 rounded-none p-0 text-[#4A4E5A] hover:bg-[#E5E7EB] hover:text-[#1A1C1E]"
                                                            title="Inspect Full Audit Record & Diff"
                                                        >
                                                            <Eye size={12} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center">
                                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-none border border-[#D1D5DB] bg-[#F9FAFB]">
                                                <Shield size={16} className="text-[#6B7280]" />
                                            </div>
                                            <p className="mt-2 text-xs font-mono text-[#1A1C1E]">
                                                {isArchivedView ? 'NO ARCHIVED AUDIT LOGS FOUND' : 'NO AUDIT LOGS RECORDED'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {isArchivedView
                                                    ? 'No archived audit logs in retention. All logs are actively tracked.'
                                                    : 'Adjust query parameters or perform administrative actions to generate activity trails.'}
                                            </p>
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
                                value={String(logs?.per_page ?? 25)}
                                onValueChange={(v) =>
                                    router.get('/audit-logs', { ...(filters ?? {}), per_page: v }, { preserveState: true })
                                }
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
                                Showing {logs?.from ?? 0}-{logs?.to ?? 0} of {logs?.total ?? 0}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(logs?.current_page ?? 1) <= 1}
                                    onClick={() =>
                                        router.get('/audit-logs', { ...(filters ?? {}), page: (logs?.current_page ?? 1) - 1 })
                                    }
                                >
                                    <ChevronLeft size={12} />
                                </Button>
                                <span className="px-1.5 font-mono text-[11px] text-foreground">
                                    {logs?.current_page ?? 1} / {logs?.last_page ?? 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 rounded-none border-[#D1D5DB] p-0 text-[#1A1C1E]"
                                    disabled={(logs?.current_page ?? 1) >= (logs?.last_page ?? 1)}
                                    onClick={() =>
                                        router.get('/audit-logs', { ...(filters ?? {}), page: (logs?.current_page ?? 1) + 1 })
                                    }
                                >
                                    <ChevronRight size={12} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUICK VIEW / INSPECTION MODAL */}
                <Dialog
                    open={viewing !== null}
                    onOpenChange={(open) => {
                        if (!open) closeView();
                    }}
                >
                    <DialogContent className="max-h-[90vh] w-full overflow-y-auto rounded-none border-[#1A1C1E] sm:max-w-[780px]">
                        {viewing && (
                            <>
                                <DialogHeader className="border-b border-[#E5E7EB] pb-3">
                                    <DialogTitle className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-[#1A1C1E]">
                                        <span className="font-mono rounded-none border border-[#1A1C1E] bg-[#1A1C1E] px-1.5 py-0.5 text-[10px] text-white">
                                            {viewing.action}
                                        </span>
                                        <span>Audit Event #{viewing.id}</span>
                                        <span
                                            className={`h-2 w-2 rounded-full ring-2 ${getSeverityDot(viewing.severity)}`}
                                        />
                                        <span className="text-[10px] font-mono uppercase text-[#6B7280]">
                                            {viewing.severity} · {viewing.module}
                                        </span>
                                        {viewing.is_undone && (
                                            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1 border border-amber-300">
                                                Reverted
                                            </span>
                                        )}
                                        {viewing.deleted_at && (
                                            <span className="text-[10px] font-mono text-gray-700 bg-gray-100 px-1 border border-gray-300">
                                                Archived
                                            </span>
                                        )}
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-3 pt-2">
                                    {/* Description full banner */}
                                    <div className="rounded-none border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[12px] font-normal text-[#1A1C1E]">
                                        <div className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider mb-1">
                                            Event Summary
                                        </div>
                                        <div className="leading-relaxed">{viewing.description}</div>
                                        {viewing.is_undone && viewing.undone_at && (
                                            <div className="mt-2 pt-2 border-t border-[#E5E7EB] font-mono text-[10.5px] text-amber-800 flex items-center gap-1.5">
                                                <Undo2 size={12} />
                                                <span>
                                                    Reverted at {viewing.undone_at}
                                                    {viewing.undone_by ? ` by ${viewing.undone_by.name}` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2-Column Info Panels */}
                                    <div className="grid items-start gap-3 sm:grid-cols-2">
                                        {/* LEFT — Actor & Network */}
                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1 text-[10.5px] font-mono uppercase tracking-wider text-[#1A1C1E] flex items-center gap-1.5">
                                                <UserIcon size={12} />
                                                Actor Identity
                                            </h3>
                                            <dl className="grid gap-1.5 text-[11.5px]">
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">User / Name</dt>
                                                    <dd className="font-medium text-[#1A1C1E]">
                                                        {viewing.user_name || viewing.user?.name || 'System Auto'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Email</dt>
                                                    <dd className="font-mono text-[#1A1C1E]">
                                                        {viewing.user_email || viewing.user?.email || 'system@internal'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Role</dt>
                                                    <dd className="font-mono text-[#1A1C1E] uppercase">
                                                        {viewing.user_role || viewing.user?.role || 'system'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">IP Address</dt>
                                                    <dd className="font-mono text-[#1A1C1E]">
                                                        {viewing.ip_address || '127.0.0.1'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Client User Agent</dt>
                                                    <dd className="font-mono text-[10px] text-[#4A4E5A] break-all">
                                                        {viewing.user_agent || 'Standard HTTP Client'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </section>

                                        {/* RIGHT — Target & Timestamp */}
                                        <section className="rounded-none border border-[#E5E7EB] bg-white p-3">
                                            <h3 className="mb-2 border-b border-[#E5E7EB] pb-1 text-[10.5px] font-mono uppercase tracking-wider text-[#1A1C1E] flex items-center gap-1.5">
                                                <Laptop size={12} />
                                                Target & Timestamp
                                            </h3>
                                            <dl className="grid gap-1.5 text-[11.5px]">
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Module</dt>
                                                    <dd className="font-mono text-[#1A1C1E] uppercase">{viewing.module}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Action Key</dt>
                                                    <dd className="font-mono text-[#1A1C1E]">{viewing.action}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Entity Type</dt>
                                                    <dd className="font-mono text-[#1A1C1E]">
                                                        {viewing.entity_type || '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Entity ID</dt>
                                                    <dd className="font-mono text-[#1A1C1E]">{viewing.entity_id || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-mono text-[#8A8FA3]">Recorded At</dt>
                                                    <dd className="font-mono text-[#1A1C1E]">
                                                        {viewing.created_at || '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </section>
                                    </div>

                                    {/* STATE CHANGES / JSON DIFF SECTION */}
                                    <section className="rounded-none border border-[#E5E7EB] bg-white p-3">
                                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-1 mb-2">
                                            <h3 className="text-[10.5px] font-mono uppercase tracking-wider text-[#1A1C1E]">
                                                State Delta & Payload
                                            </h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={copyEventJson}
                                                className="h-6 rounded-none px-2 text-[10px] font-mono text-[#4A4E5A]"
                                            >
                                                <Copy size={11} className="mr-1" />
                                                {copiedJson ? 'Copied' : 'Copy Full JSON'}
                                            </Button>
                                        </div>

                                        {viewing.old_values || viewing.new_values ? (
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div>
                                                    <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">
                                                        Previous State (Old Values)
                                                    </div>
                                                    <pre className="max-h-48 overflow-auto rounded-none border border-[#E5E7EB] bg-[#F9FAFB] p-2 font-mono text-[10px] text-[#1A1C1E]">
                                                        {viewing.old_values
                                                            ? JSON.stringify(viewing.old_values, null, 2)
                                                            : '// No prior state (created/logged)'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">
                                                        New State (Updated Values)
                                                    </div>
                                                    <pre className="max-h-48 overflow-auto rounded-none border border-[#E5E7EB] bg-[#F9FAFB] p-2 font-mono text-[10px] text-[#1A1C1E]">
                                                        {viewing.new_values
                                                            ? JSON.stringify(viewing.new_values, null, 2)
                                                            : '// State deleted or non-mutative'}
                                                    </pre>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 text-center text-[11px] font-mono text-[#8A8FA3] border border-dashed border-[#E5E7EB]">
                                                No structured delta recorded for this event.
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB]">
                                    <div className="flex items-center gap-1.5">
                                        {viewing.can_undo && (
                                            <Button
                                                type="button"
                                                disabled={processingAction}
                                                onClick={() => handleUndo(viewing)}
                                                className="h-7 rounded-none bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-normal"
                                            >
                                                <Undo2 size={12} className="mr-1" /> Undo Change
                                            </Button>
                                        )}
                                        {viewing.can_redo && (
                                            <Button
                                                type="button"
                                                disabled={processingAction}
                                                onClick={() => handleRedo(viewing)}
                                                className="h-7 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-normal"
                                            >
                                                <Redo2 size={12} className="mr-1" /> Redo Change
                                            </Button>
                                        )}
                                        {viewing.deleted_at ? (
                                            <Button
                                                variant="outline"
                                                type="button"
                                                disabled={processingAction}
                                                onClick={() => handleRestoreLog(viewing.id)}
                                                className="h-7 rounded-none border-emerald-300 text-emerald-800 text-[11px]"
                                            >
                                                <ArchiveRestore size={12} className="mr-1" /> Restore from Archive
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                type="button"
                                                disabled={processingAction}
                                                onClick={() => handleArchiveLog(viewing.id)}
                                                className="h-7 rounded-none border-[#D1D5DB] text-[#6B7280] hover:text-amber-800 text-[11px]"
                                            >
                                                <Archive size={12} className="mr-1" /> Archive Log
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={closeView}
                                        className="h-7 rounded-none border-[#D1D5DB] text-[11px]"
                                    >
                                        Close
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ARCHIVE RETENTION MODAL (No hard delete) */}
                <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-[460px]">
                        <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                            <DialogTitle className="flex items-center gap-2 text-[14px] font-bold text-[#1A1C1E]">
                                <Archive size={16} />
                                Archive Historical Audit Logs
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 pt-2 text-[11.5px] text-[#1A1C1E]">
                            <p className="leading-relaxed">
                                Archives past audit records from the active table into the historical archive view. <strong>No data is deleted</strong> — all records remain safely preserved and can be restored or inspected at any time.
                            </p>

                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-[#6B7280]">Retention cutoff:</span>
                                <Select value={purgeDays} onValueChange={setPurgeDays}>
                                    <SelectTrigger className="h-7 w-48 rounded-none border-[#D1D5DB] text-[11px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="30" className="text-[11px]">Older than 30 days</SelectItem>
                                        <SelectItem value="60" className="text-[11px]">Older than 60 days</SelectItem>
                                        <SelectItem value="90" className="text-[11px]">Older than 90 days (Default)</SelectItem>
                                        <SelectItem value="180" className="text-[11px]">Older than 180 days</SelectItem>
                                        <SelectItem value="365" className="text-[11px]">Older than 1 year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 pt-3 border-t border-[#E5E7EB]">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setPurgeDialogOpen(false)}
                                className="rounded-none text-[11px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={purging}
                                onClick={handlePurge}
                                className="rounded-none bg-[#1A1C1E] hover:bg-black text-white text-[11px]"
                            >
                                {purging ? 'Archiving...' : 'Confirm Archive'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

AuditLogsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Audit Logs',
            href: '/audit-logs',
        },
    ],
};
