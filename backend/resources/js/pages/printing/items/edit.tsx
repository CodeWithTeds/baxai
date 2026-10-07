import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { dashboard } from '@/routes';
import { PrintItemForm } from './create';

interface PrintItemData {
    id: number;
    name: string;
    item_code: string;
    category_id: number;
    description: string | null;
    paper_type: string | null;
    paper_size: string | null;
    brand: string | null;
    model: string | null;
    available_quantity: number;
    unit: string | null;
    compatibility: string | null;
    print_sides: string;
    color_mode: string;
    turnaround_time: string;
    base_price: string | number;
    min_quantity: number;
    status: string;
    notes: string | null;
    image_url: string | null;
    sort_order: number;
}

interface CategoryOption {
    id: number;
    name: string;
    code: string;
}

export default function EditPrintItem({ item, categories = [] }: { item: PrintItemData; categories: CategoryOption[] }) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        name: item.name ?? '',
        item_code: item.item_code ?? '',
        category_id: item.category_id ?? '',
        description: item.description ?? '',
        paper_type: item.paper_type ?? '',
        paper_size: item.paper_size ?? '',
        brand: item.brand ?? '',
        model: item.model ?? '',
        available_quantity: item.available_quantity ?? 0,
        unit: item.unit ?? '',
        compatibility: item.compatibility ?? '',
        print_sides: item.print_sides ?? 'single_sided',
        color_mode: item.color_mode ?? 'full_color',
        turnaround_time: item.turnaround_time ?? '1-2 Business Days',
        base_price: item.base_price ?? '0.00',
        min_quantity: item.min_quantity ?? 1,
        status: item.status ?? 'active',
        notes: item.notes ?? '',
        image: null as File | null,
        image_url: item.image_url ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/print-items/${item.id}`);
    };

    return (
        <>
            <Head title={`Edit — ${item.name}`} />
            <PrintItemForm
                initial={item}
                data={data}
                setData={setData}
                categories={categories}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Save Changes"
            />
        </>
    );
}

EditPrintItem.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Printing Services',
            href: '/print-items',
        },
        {
            title: 'Edit Resource',
            href: '/print-items',
        },
    ],
};
