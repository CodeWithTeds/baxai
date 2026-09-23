import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { dashboard } from '@/routes';
import { CustomerForm } from './create';

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
    sort_order: number;
}

export default function EditCustomer({ customer }: { customer: CustomerData }) {
    const { data, setData, put, processing, errors } = useForm({
        name: customer.name ?? '',
        customer_code: customer.customer_code ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        company: customer.company ?? '',
        status: customer.status ?? 'active',
        type: customer.type ?? 'individual',
        address: customer.address ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        postal_code: customer.postal_code ?? '',
        country: customer.country ?? 'Philippines',
        notes: customer.notes ?? '',
        sort_order: customer.sort_order ?? 0,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/customers/${customer.id}`);
    };

    return (
        <>
            <Head title={`Edit — ${customer.name}`} />
            <CustomerForm
                initial={customer}
                data={data}
                setData={setData}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Save changes"
            />
        </>
    );
}

EditCustomer.layout = {
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
            title: 'Edit',
            href: '/customers',
        },
    ],
};
