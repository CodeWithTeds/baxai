import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AlertTriangle,
    Boxes,
    CheckCircle2,
    Clock,
    Eye,
    Package,
    Plus,
    RefreshCw,
    Search,
    Shield,
    ShoppingBag,
    Truck,
    UserCheck,
    Warehouse,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';

interface ItemSummary {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
}

interface OrderRow {
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    status: string;
    payment_status: string;
    payment_method: string | null;
    total: number;
    items_count: number;
    items_summary: ItemSummary[];
    placed_at: string;
    shipping_address: string | null;
    notes: string | null;
}

interface LowStockItem {
    id: number;
    name: string;
    sku: string;
    category: string | null;
    stock_quantity: number;
    status: string;
}

interface StockMaterial {
    id: number;
    name: string;
    code: string;
    base_price: string | number;
    status: string;
}

interface StaffTask {
    id: number;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
}

interface StaffInfo {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    employee_id: string;
    department: string;
    position: string;
    workstation: string;
    shift: string;
    phone: string | null;
}

interface StaffPortalProps {
    staff_info: StaffInfo;
    metrics: {
        in_progress: number;
        processing: number;
        delivered_today: number;
        low_stock_count: number;
    };
    orders: OrderRow[];
    low_stock_items: LowStockItem[];
    stock_materials: StockMaterial[];
    tasks: StaffTask[];
}

export default function StaffPortal({
    staff_info,
    metrics,
    orders = [],
    low_stock_items = [],
    stock_materials = [],
    tasks = [],
}: StaffPortalProps) {
    const pageProps = usePage().props as unknown as {
        flash?: { success?: string; error?: string };
    };
    const flash = pageProps.flash ?? {};

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState<string>('');
    const [viewingOrder, setViewingOrder] = useState<OrderRow | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState<string>('');
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

    const filteredOrders = orders.filter((o) => {
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesSearch =
            search === '' ||
            o.order_number.toLowerCase().includes(search.toLowerCase()) ||
            o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_phone && o.customer_phone.includes(search));
        return matchesStatus && matchesSearch;
    });

    const handleUpdateStatus = (orderId: number, nextStatus: string) => {
        setUpdatingOrderId(orderId);
        router.post(
            `/staff-portal/orders/${orderId}/status`,
            { status: nextStatus },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingOrderId(null),
            }
        );
    };

    const handleToggleTask = (taskId: number) => {
        router.post(
            `/staff-portal/tasks/${taskId}/toggle`,
            {},
            { preserveScroll: true }
        );
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        router.post(
            '/staff-portal/tasks',
            { title: newTaskTitle.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setNewTaskTitle(''),
            }
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_progress':
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-blue-300 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-700">
                        <Clock size={10} /> IN PROGRESS
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
                        <Package size={10} /> PROCESSING
                    </span>
                );
            case 'delivered':
                return (
                    <span className="inline-flex items-center gap-1 rounded-none border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
                        <Truck size={10} /> DELIVERED
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-none border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-[10px] text-gray-700 uppercase">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="flex flex-col gap-4 font-sans text-[#1A1C1E]">
            <Head title="Staff Operations Portal" />

            {/* TOP BAR / SHIFT BANNER */}
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[#1A1C1E] bg-[#F9FAFB] p-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[#1A1C1E] text-white font-mono font-bold text-xs">
                            {staff_info.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1A1C1E]">{staff_info.name}</span>
                                <Badge className="rounded-none bg-[#1A1C1E] text-white hover:bg-black font-mono text-[10px]">
                                    {staff_info.role.toUpperCase()}
                                </Badge>
                                <span className="font-mono text-[11px] text-[#6B7280]">
                                    [{staff_info.employee_id}]
                                </span>
                            </div>
                            <p className="text-[11px] text-[#6B7280]">
                                {staff_info.position} · {staff_info.department}
                            </p>
                        </div>
                    </div>

                    <div className="hidden h-7 w-[1px] bg-[#D1D5DB] md:block" />

                    <div className="flex flex-wrap items-center gap-4 text-[11px]">
                        <div>
                            <span className="text-[#8A8FA3]">Station:</span>{' '}
                            <span className="font-semibold text-[#1A1C1E]">{staff_info.workstation}</span>
                        </div>
                        <div>
                            <span className="text-[#8A8FA3]">Shift:</span>{' '}
                            <span className="font-semibold text-[#1A1C1E]">{staff_info.shift}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-[#4B5563]">
                        <Shield size={12} className="text-emerald-600" />
                        <span>RBAC Active: Operator Mode</span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => router.reload()}
                        className="h-7 rounded-none border-[#1A1C1E] bg-white px-2 text-[11px] font-normal hover:bg-[#F3F4F6]"
                    >
                        <RefreshCw size={11} className="mr-1" /> Refresh Queue
                    </Button>
                </div>
            </div>

            {/* FLASH NOTIFICATIONS */}
            {flash.success && (
                <div className="flex items-center gap-2 rounded-none border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash.error && (
                <div className="flex items-center gap-2 rounded-none border border-rose-600 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <AlertTriangle size={14} className="shrink-0 text-rose-600" />
                    <span>{flash.error}</span>
                </div>
            )}

            {/* 4 OPERATIONAL KPI TILES */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="border border-[#1A1C1E] bg-white p-3">
                    <div className="flex items-center justify-between text-[#6B7280]">
                        <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">Queue: In Progress</span>
                        <Clock size={14} className="text-blue-600" />
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold text-[#1A1C1E]">
                        {metrics.in_progress}
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">Awaiting packaging / pick</p>
                </div>

                <div className="border border-[#1A1C1E] bg-white p-3">
                    <div className="flex items-center justify-between text-[#6B7280]">
                        <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">Processing & Packed</span>
                        <Package size={14} className="text-amber-600" />
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold text-[#1A1C1E]">
                        {metrics.processing}
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">Ready for courier handoff</p>
                </div>

                <div className="border border-[#1A1C1E] bg-white p-3">
                    <div className="flex items-center justify-between text-[#6B7280]">
                        <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">Dispatched Today</span>
                        <Truck size={14} className="text-emerald-600" />
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold text-[#1A1C1E]">
                        {metrics.delivered_today}
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">Completed deliveries today</p>
                </div>

                <div className="border border-[#1A1C1E] bg-white p-3">
                    <div className="flex items-center justify-between text-[#6B7280]">
                        <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">Stock Warnings</span>
                        <Warehouse size={14} className="text-rose-600" />
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold text-[#1A1C1E]">
                        {metrics.low_stock_count}
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">Items ≤ 10 units threshold</p>
                </div>
            </div>

            {/* MAIN TWO-COLUMN WORKSPACE: ORDERS FULFILLMENT QUEUE + WORKSTATION WIDGETS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* LEFT 2 COLUMNS: FULFILLMENT QUEUE */}
                <div className="flex flex-col border border-[#1A1C1E] bg-white p-4 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-tight text-[#1A1C1E]">
                                Fulfillment & Dispatch Queue
                            </h2>
                            <p className="text-[11px] text-[#6B7280]">
                                Process incoming orders, update stages, and dispatch to couriers.
                            </p>
                        </div>

                        {/* STATUS FILTER PILLS */}
                        <div className="flex items-center gap-1">
                            {(['all', 'in_progress', 'processing', 'delivered'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`h-6 rounded-none px-2 font-mono text-[10px] uppercase font-semibold transition ${
                                        statusFilter === st
                                            ? 'bg-[#1A1C1E] text-white'
                                            : 'border border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-[#F3F4F6]'
                                    }`}
                                >
                                    {st.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SEARCH FILTER */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8FA3]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by order #, customer name, phone..."
                                className="h-7 rounded-none border-[#D1D5DB] pl-8 text-xs focus-visible:ring-0"
                            />
                        </div>
                        {search && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setSearch('')}
                                className="h-7 rounded-none px-2 text-[11px] text-[#6B7280]"
                            >
                                Clear
                            </Button>
                        )}
                    </div>

                    {/* FULFILLMENT TABLE */}
                    <div className="mt-3 overflow-x-auto border border-[#E5E7EB]">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[10px] uppercase text-[#6B7280]">
                                <tr>
                                    <th className="p-2.5">Order</th>
                                    <th className="p-2.5">Customer & Items</th>
                                    <th className="p-2.5">Status</th>
                                    <th className="p-2.5 text-right">Fulfillment Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-[#6B7280]">
                                            No orders matching current filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-[#F9FAFB]">
                                            <td className="p-2.5 align-top">
                                                <div className="font-mono font-bold text-[#1A1C1E]">
                                                    {order.order_number}
                                                </div>
                                                <div className="text-[10px] text-[#6B7280]">
                                                    {order.placed_at}
                                                </div>
                                                <div className="mt-1 font-mono text-[11px] font-semibold text-[#1A1C1E]">
                                                    ₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </td>

                                            <td className="p-2.5 align-top">
                                                <div className="font-semibold text-[#1A1C1E]">
                                                    {order.customer_name}
                                                </div>
                                                <div className="font-mono text-[10px] text-[#6B7280]">
                                                    {order.customer_phone || order.customer_email || 'No phone'}
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {order.items_summary.slice(0, 2).map((item) => (
                                                        <span
                                                            key={item.id}
                                                            className="inline-block border border-[#E5E7EB] bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-[10px] text-[#374151]"
                                                        >
                                                            {item.quantity}x {item.name}
                                                        </span>
                                                    ))}
                                                    {order.items_count > 2 && (
                                                        <span className="font-mono text-[10px] text-[#8A8FA3]">
                                                            +{order.items_count - 2} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-2.5 align-top">
                                                {getStatusBadge(order.status)}
                                            </td>

                                            <td className="p-2.5 align-top text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setViewingOrder(order)}
                                                        className="h-6 rounded-none border-[#D1D5DB] px-2 text-[10px] hover:bg-[#F3F4F6]"
                                                    >
                                                        <Eye size={10} className="mr-1" /> View
                                                    </Button>

                                                    {order.status === 'in_progress' && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={updatingOrderId === order.id}
                                                            onClick={() => handleUpdateStatus(order.id, 'processing')}
                                                            className="h-6 rounded-none bg-amber-600 px-2 text-[10px] text-white hover:bg-amber-700 font-mono"
                                                        >
                                                            Mark Processing
                                                        </Button>
                                                    )}

                                                    {order.status === 'processing' && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={updatingOrderId === order.id}
                                                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                                            className="h-6 rounded-none bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-700 font-mono"
                                                        >
                                                            Mark Dispatched
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT COLUMN: WORKSTATION SHIFT CHECKLIST & LOW STOCK WARNINGS */}
                <div className="flex flex-col gap-4">
                    {/* WORKSTATION TASKS & SHIFT CHECKLIST */}
                    <div className="border border-[#1A1C1E] bg-white p-4">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-tight text-[#1A1C1E]">
                                Workstation Tasks & Shift Checklist
                            </h3>
                            <span className="font-mono text-[10px] text-[#6B7280]">
                                {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} done
                            </span>
                        </div>

                        {/* ADD TASK FORM */}
                        <form onSubmit={handleCreateTask} className="mt-2.5 flex items-center gap-1.5">
                            <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Add shift task..."
                                className="h-7 rounded-none border-[#D1D5DB] text-xs focus-visible:ring-0"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-xs text-white hover:bg-black"
                            >
                                <Plus size={12} />
                            </Button>
                        </form>

                        {/* TASK LIST */}
                        <div className="mt-3 flex flex-col gap-1.5">
                            {tasks.length === 0 ? (
                                <p className="py-3 text-center text-[11px] text-[#6B7280]">
                                    No tasks assigned yet. Add one above.
                                </p>
                            ) : (
                                tasks.map((task) => {
                                    const isDone = task.status === 'completed';
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleToggleTask(task.id)}
                                            className={`flex cursor-pointer items-start gap-2 border p-2 text-xs transition ${
                                                isDone
                                                    ? 'border-[#E5E7EB] bg-[#F9FAFB] text-[#8A8FA3] line-through'
                                                    : 'border-[#D1D5DB] bg-white text-[#1A1C1E] hover:border-[#1A1C1E]'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={isDone}
                                                className="mt-0.5 rounded-none"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium leading-tight">{task.title}</p>
                                                {task.description && (
                                                    <p className="mt-0.5 text-[10px] text-[#6B7280]">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* LOW STOCK MATERIAL ALERTS */}
                    <div className="border border-[#1A1C1E] bg-white p-4">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-tight text-[#1A1C1E]">
                                Low Stock Inventory Alerts
                            </h3>
                            <Badge className="rounded-none bg-rose-600 text-white font-mono text-[10px]">
                                {low_stock_items.length} ALERTS
                            </Badge>
                        </div>

                        <div className="mt-2.5 flex flex-col divide-y divide-[#E5E7EB]">
                            {low_stock_items.length === 0 ? (
                                <p className="py-3 text-center text-[11px] text-[#6B7280]">
                                    All stock quantities are above healthy thresholds.
                                </p>
                            ) : (
                                low_stock_items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                                        <div>
                                            <p className="font-semibold text-[#1A1C1E]">{item.name}</p>
                                            <p className="font-mono text-[10px] text-[#6B7280]">
                                                SKU: {item.sku}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono text-sm font-bold text-rose-600">
                                                {item.stock_quantity} left
                                            </span>
                                            <span className="block font-mono text-[9px] uppercase text-[#8A8FA3]">
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RBAC GOVERNANCE SUMMARY NOTICE */}
                    <div className="border border-[#D1D5DB] bg-[#F9FAFB] p-3 text-xs text-[#4B5563]">
                        <div className="flex items-center gap-1.5 font-semibold text-[#1A1C1E]">
                            <Shield size={13} className="text-[#0052CC]" />
                            <span>Role-Based Access Governance</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">
                            Your account is signed in under the <strong>Staff</strong> role. Administrative controls
                            including <strong>Staff & User Management</strong>, <strong>Audit Logs</strong>, and <strong>System Settings</strong> are
                            strictly protected and omitted from your navigation console.
                        </p>
                    </div>
                </div>
            </div>

            {/* ORDER DETAIL MODAL */}
            {viewingOrder && (
                <Dialog open={Boolean(viewingOrder)} onOpenChange={() => setViewingOrder(null)}>
                    <DialogContent className="max-w-md rounded-none border border-[#1A1C1E] p-5">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between text-sm font-bold uppercase">
                                <span>Order #{viewingOrder.order_number}</span>
                                {getStatusBadge(viewingOrder.status)}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="mt-3 flex flex-col gap-3 text-xs">
                            <div className="border-b border-[#E5E7EB] pb-2">
                                <span className="text-[#8A8FA3] block text-[10px] uppercase font-mono">Customer Info</span>
                                <p className="font-semibold text-[#1A1C1E]">{viewingOrder.customer_name}</p>
                                <p className="font-mono text-[11px] text-[#6B7280]">{viewingOrder.customer_phone || 'No phone'}</p>
                                <p className="font-mono text-[11px] text-[#6B7280]">{viewingOrder.customer_email || 'No email'}</p>
                            </div>

                            {viewingOrder.shipping_address && (
                                <div className="border-b border-[#E5E7EB] pb-2">
                                    <span className="text-[#8A8FA3] block text-[10px] uppercase font-mono">Shipping Address</span>
                                    <p className="text-[#1A1C1E]">{viewingOrder.shipping_address}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-[#8A8FA3] block text-[10px] uppercase font-mono">Order Line Items</span>
                                <div className="mt-1 divide-y divide-[#E5E7EB] border border-[#E5E7EB]">
                                    {viewingOrder.items_summary.map((it) => (
                                        <div key={it.id} className="flex items-center justify-between p-2">
                                            <span>{it.quantity}x {it.name}</span>
                                            <span className="font-mono">₱{(it.quantity * it.unit_price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 flex justify-between font-bold text-[#1A1C1E]">
                                    <span>Total:</span>
                                    <span className="font-mono">₱{viewingOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {viewingOrder.notes && (
                                <div className="border-t border-[#E5E7EB] pt-2 text-[11px] text-[#6B7280]">
                                    <span className="font-semibold">Notes:</span> {viewingOrder.notes}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-4 flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setViewingOrder(null)}
                                className="h-7 rounded-none text-xs"
                            >
                                Close
                            </Button>
                            {viewingOrder.status === 'in_progress' && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        handleUpdateStatus(viewingOrder.id, 'processing');
                                        setViewingOrder(null);
                                    }}
                                    className="h-7 rounded-none bg-amber-600 text-xs text-white hover:bg-amber-700"
                                >
                                    Mark Processing
                                </Button>
                            )}
                            {viewingOrder.status === 'processing' && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        handleUpdateStatus(viewingOrder.id, 'delivered');
                                        setViewingOrder(null);
                                    }}
                                    className="h-7 rounded-none bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                >
                                    Mark Dispatched
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

StaffPortal.layout = {
    breadcrumbs: [
        {
            title: 'Staff Portal',
            href: '/staff-portal',
        },
    ],
};
