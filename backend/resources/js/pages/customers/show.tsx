import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { dashboard } from '@/routes';

interface CustomerData {
    id: number;
    name: string;
    customer_code: string;
    email: string;
    phone: string | null;
    company: string | null;
    status: string;
    type: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    notes: string | null;
    total_orders: number;
    total_spent: string;
}

export default function ShowCustomer({ customer }: { customer: CustomerData }) {
    return (
        <>
            <Head title={customer.name} />
            <div className="rounded-none border border-[#E5E7EB] bg-white font-sans text-[#1A1C1E]">
                <div className="flex flex-wrap items-start gap-4 p-5">
                    <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-none border border-[#D1D5DB] bg-white px-2 py-0.5 text-[10px] font-mono tracking-wider text-[#374151] uppercase">
                                {customer.type}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-xs text-[#1A1C1E] capitalize">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        customer.status === 'active'
                                            ? 'bg-[#1A1C1E]'
                                            : customer.status === 'lead'
                                              ? 'bg-gray-500'
                                              : 'bg-gray-300'
                                    }`}
                                />
                                {customer.status}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">{customer.name}</h1>
                        <p className="mt-0.5 font-mono text-xs text-[#6B7280]">
                            [{customer.customer_code}] · {customer.email}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="flex items-center gap-2 text-xs text-[#1A1C1E]">
                                <Mail size={14} className="text-[#6B7280]" />
                                <span className="font-mono">{customer.email}</span>
                            </div>
                            {customer.phone && (
                                <div className="flex items-center gap-2 text-xs text-[#1A1C1E]">
                                    <Phone size={14} className="text-[#6B7280]" />
                                    <span className="font-mono">{customer.phone}</span>
                                </div>
                            )}
                            {customer.company && (
                                <div className="flex items-center gap-2 text-xs text-[#1A1C1E]">
                                    <Building2 size={14} className="text-[#6B7280]" />
                                    <span>{customer.company}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 sm:grid-cols-3 rounded-none">
                            <div>
                                <p className="font-mono text-[10px] text-[#6B7280] uppercase">Total Orders</p>
                                <p className="mt-1 font-mono text-base font-bold text-[#1A1C1E]">{customer.total_orders}</p>
                            </div>
                            <div>
                                <p className="font-mono text-[10px] text-[#6B7280] uppercase">Total Spent</p>
                                <p className="mt-1 font-mono text-base font-bold text-[#1A1C1E]">₱{Number(customer.total_spent).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                                <p className="font-mono text-[10px] text-[#6B7280] uppercase">Location</p>
                                <p className="mt-1 text-xs font-medium text-[#1A1C1E]">
                                    {[customer.city, customer.state, customer.country].filter(Boolean).join(', ') || '—'}
                                </p>
                            </div>
                        </div>

                        {customer.notes && (
                            <div className="mt-5 border-t border-[#E5E7EB] pt-3">
                                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Notes & Preferences</h3>
                                <p className="mt-1 text-xs leading-relaxed text-[#1A1C1E]">{customer.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3">
                    <Link href={`/customers/${customer.id}/edit`}>
                        <Button size="sm" className="h-7 rounded-none bg-[#1A1C1E] text-white hover:bg-black text-xs">
                            <Pencil size={12} className="mr-1" /> Edit
                        </Button>
                    </Link>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-none text-red-600 border-red-200 text-xs"
                        onClick={() => {
                            if (confirm('Archive this customer?')) router.delete(`/customers/${customer.id}`);
                        }}
                    >
                        <Trash2 size={12} className="mr-1" /> Archive
                    </Button>
                    <Link href="/customers" className="ml-auto">
                        <Button size="sm" variant="ghost" className="h-7 rounded-none text-xs">
                            Back to list
                        </Button>
                    </Link>
                </div>
            </div>
        </>
    );
}

ShowCustomer.layout = {
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
            title: 'Details',
            href: '/customers',
        },
    ],
};
