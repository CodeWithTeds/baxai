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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Package,
    RotateCcw,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { dashboard } from '@/routes';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface PrintOrderRow {
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string;
    service_name: string;
    quantity: number;
    total: string;
    status: string;
    payment_method: string;
    payment_status: string;
    fulfillment_type: string;
    placed_at: string;
    file_name: string;
    file_type: string;
}

interface Paginated {
    data: PrintOrderRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_production', label: 'In Production' },
    { value: 'ready', label: 'Ready' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_production: 'bg-blue-100 text-blue-800',
    ready: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    picked_up: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

export default function PrintOrdersIndex() {
    const { props } = usePage<{ printOrders: Paginated }>();
    const { printOrders } = props;

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [sortField, setSortField] = useState('placed_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [viewOrder, setViewOrder] = useState<PrintOrderRow | null>(null);

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            '/print-orders',
            { search: value, status, sort_field: sortField, sort_dir: sortDir },
            { preserveState: true, replace: true }
        );
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        router.get(
            '/print-orders',
            { search, status: value, sort_field: sortField, sort_dir: sortDir },
            { preserveState: true, replace: true }
        );
    };

    const handleSort = (field: string) => {
        const newDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDir(newDir);
        router.get(
            '/print-orders',
            { search, status, sort_field: field, sort_dir: newDir },
            { preserveState: true, replace: true }
        );
    };

    return (
        <>
            <Head title="Print Orders" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Print Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage and track all print orders
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by order #, customer, or service..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-medium">
                                    <button
                                        onClick={() => handleSort('order_number')}
                                        className="flex items-center gap-1 hover:text-foreground"
                                    >
                                        Order #
                                        <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </th>
                                <th className="p-3 text-left font-medium">Customer</th>
                                <th className="p-3 text-left font-medium">Service</th>
                                <th className="p-3 text-left font-medium">Qty</th>
                                <th className="p-3 text-left font-medium">Total</th>
                                <th className="p-3 text-left font-medium">Status</th>
                                <th className="p-3 text-left font-medium">Payment</th>
                                <th className="p-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printOrders.data.map((order) => (
                                <tr key={order.id} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                        <div className="font-medium">{order.order_number}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(order.placed_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-medium">{order.customer_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {order.customer_email}
                                        </div>
                                    </td>
                                    <td className="p-3">{order.service_name}</td>
                                    <td className="p-3">{order.quantity}</td>
                                    <td className="p-3 font-medium">₱{Number(order.total).toFixed(2)}</td>
                                    <td className="p-3">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs uppercase">{order.payment_method}</span>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                    order.payment_status === 'paid'
                                                        ? 'bg-green-100 text-green-800'
                                                        : order.payment_status === 'pending_verification'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {order.payment_status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setViewOrder(order)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Link href={`/print-orders/${order.id}/file`}>
                                                <Button variant="outline" size="sm">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {printOrders.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {printOrders.from} to {printOrders.to} of{' '}
                            {printOrders.total} results
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={printOrders.current_page === 1}
                                onClick={() =>
                                    router.get(`/print-orders?page=${printOrders.current_page - 1}`)
                                }
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={printOrders.current_page === printOrders.last_page}
                                onClick={() =>
                                    router.get(`/print-orders?page=${printOrders.current_page + 1}`)
                                }
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={viewOrder !== null} onOpenChange={() => setViewOrder(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Order {viewOrder?.order_number}</DialogTitle>
                    </DialogHeader>
                    {viewOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Customer:</span>
                                    <p className="font-medium">{viewOrder.customer_name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Email:</span>
                                    <p className="font-medium">{viewOrder.customer_email}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Service:</span>
                                    <p className="font-medium">{viewOrder.service_name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Quantity:</span>
                                    <p className="font-medium">{viewOrder.quantity}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total:</span>
                                    <p className="font-medium">₱{Number(viewOrder.total).toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Fulfillment:</span>
                                    <p className="font-medium capitalize">{viewOrder.fulfillment_type}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">File:</span>
                                    <p className="font-medium">{viewOrder.file_name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Placed:</span>
                                    <p className="font-medium">
                                        {new Date(viewOrder.placed_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/print-orders/${viewOrder.id}/edit`}>
                                    <Button variant="outline" size="sm">
                                        Update Status
                                    </Button>
                                </Link>
                                <Link href={`/print-orders/${viewOrder.id}/file`}>
                                    <Button variant="outline" size="sm">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download File
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
