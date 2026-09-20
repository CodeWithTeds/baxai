import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { dashboard } from '@/routes';
import { ProductForm } from './create';

export default function EditProduct({ product }: { product: any }) {
    const { data, setData, put, processing, errors } = useForm({
        name: product.name ?? '',
        slug: product.slug ?? '',
        category: product.category ?? 'mugs',
        description: product.description ?? '',
        short_description: product.short_description ?? '',
        badge: product.badge ?? '',
        status: product.status ?? 'draft',
        base_price: product.base_price ?? '',
        compare_at_price: product.compare_at_price ?? '',
        unit: product.unit ?? 'piece',
        sku: product.sku ?? '',
        stock_quantity: product.stock_quantity ?? 0,
        low_stock_alert_at: product.low_stock_alert_at ?? 20,
        track_inventory: !!product.track_inventory,
        thumbnail: product.thumbnail ?? '',
        reference_image: null,
        gallery_images: product.gallery_images ?? [],
        has_3d_preview: !!product.has_3d_preview,
        is_customizable: !!product.is_customizable,
        viewer_type: product.viewer_type ?? 'none',
        model_3d_url: product.model_3d_url ?? '',
        fallback_image: product.fallback_image ?? '',
        allow_color_change: !!product.allow_color_change,
        available_colors: product.available_colors ?? [],
        allow_custom_text: !!product.allow_custom_text,
        max_text_length: product.max_text_length ?? 30,
        allow_image_upload: !!product.allow_image_upload,
        print_method: product.print_method ?? '',
        print_size: product.print_size ?? '',
        customization_addon_price:
            product.customization_addon_price ?? '',
        has_variants: !!product.has_variants,
        is_featured_home: !!product.is_featured_home,
        is_featured_services: !!product.is_featured_services,
        sort_order: product.sort_order ?? 0,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/products/${product.id}`);
    };

    return (
        <>
            <Head title={`Edit — ${product.name}`} />
            <ProductForm
                initial={product}
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

EditProduct.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Products',
            href: '/products',
        },
        {
            title: 'Edit',
            href: '/products',
        },
    ],
};
