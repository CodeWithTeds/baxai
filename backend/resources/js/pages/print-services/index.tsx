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
    Package,
    Plus,
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

interface PrintServiceRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    base_price: string;
    unit: string;
    min_quantity: number;
    max_file_size_mb: number;
    allowed_file_types: string[] | null;
    rush_surcharge_type: string;
    rush_surcharge_amount: string;
    turnaround_time: string | null;
    rush_turnaround_time: string | null;
    sort_order: number;
}

interface Paginated {
    data: PrintServiceRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

export default function PrintServicesIndex() {
    const { props } = usePage<{ printServices: Paginated }>();
    const { printServices } = props;

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [sortField, setSortField] = useState('sort_order');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            '/print-services',
            { search: value, status, sort_field: sortField, sort_dir: sortDir },
            { preserveState: true, replace: true }
        );
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        router.get(
            '/print-services',
            { search, status: value, sort_field: sortField, sort_dir: sortDir },
            { preserveState: true, replace: true }
        );
    };

    const handleSort = (field: string) => {
        const newDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDir(newDir);
        router.get(
            '/print-services',
            { search, status, sort_field: field, sort_dir: newDir },
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = () => {
        if (deleteId) {
            router.delete(`/print-services/${deleteId}`, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    return (
        <>
            <Head title="Print Services" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Print Services</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your printing service offerings
                        </p>
                    </div>
                    <Link href="/print-services/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Service
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search services..."
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
                                        onClick={() => handleSort('name')}
                                        className="flex items-center gap-1 hover:text-foreground"
                                    >
                                        Name
                                        <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </th>
                                <th className="p-3 text-left font-medium">Slug</th>
                                <th className="p-3 text-left font-medium">Base Price</th>
                                <th className="p-3 text-left font-medium">Unit</th>
                                <th className="p-3 text-left font-medium">Rush</th>
                                <th className="p-3 text-left font-medium">Status</th>
                                <th className="p-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printServices.data.map((service) => (
                                <tr key={service.id} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                        <div className="font-medium">{service.name}</div>
                                        {service.description && (
                                            <div className="text-xs text-muted-foreground">
                                                {service.description.substring(0, 50)}...
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-muted-foreground">{service.slug}</td>
                                    <td className="p-3">₱{Number(service.base_price).toFixed(2)}</td>
                                    <td className="p-3 text-muted-foreground">{service.unit}</td>
                                    <td className="p-3">
                                        {service.rush_surcharge_type !== 'none' ? (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                {service.rush_surcharge_type === 'percentage'
                                                    ? `+${service.rush_surcharge_amount}%`
                                                    : `+₱${Number(service.rush_surcharge_amount).toFixed(2)}`}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                service.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {service.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/print-services/${service.id}/edit`}>
                                                <Button variant="outline" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteId(service.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {printServices.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {printServices.from} to {printServices.to} of{' '}
                            {printServices.total} results
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={printServices.current_page === 1}
                                onClick={() =>
                                    router.get(`/print-services?page=${printServices.current_page - 1}`)
                                }
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={printServices.current_page === printServices.last_page}
                                onClick={() =>
                                    router.get(`/print-services?page=${printServices.current_page + 1}`)
                                }
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Print Service</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this print service? This action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
