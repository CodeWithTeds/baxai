import { Head, Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cuboid, Pencil, Trash2 } from 'lucide-react';
import { dashboard } from '@/routes';

export default function ShowProduct({ product }: { product: any }) {
    return (
        <>
            <Head title={product.name} />
            <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex flex-wrap items-start gap-4 p-6">
                        <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                                <Badge>{product.category}</Badge>
                                <Badge variant="outline">
                                    {product.status}
                                </Badge>
                                {product.is_customizable && (
                                    <Badge variant="secondary">
                                        <Cuboid size={12} className="mr-1" />
                                        {product.viewer_type} 3D
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-2xl font-extrabold">
                                {product.name}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {product.sku} · ₱{product.base_price} · Stock{' '}
                                {product.stock_quantity}
                            </p>
                            <p className="mt-4 text-sm leading-relaxed text-gray-700">
                                {product.description ||
                                    'No description.'}
                            </p>
                            <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
                                <div>
                                    <dt className="text-gray-400">Print</dt>
                                    <dd className="font-semibold">
                                        {product.print_method ?? '—'} ·{' '}
                                        {product.print_size ?? '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400">
                                        Custom text
                                    </dt>
                                    <dd className="font-semibold">
                                        {product.allow_custom_text
                                            ? `Yes (${product.max_text_length})`
                                            : 'No'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400">
                                        Image upload
                                    </dt>
                                    <dd className="font-semibold">
                                        {product.allow_image_upload
                                            ? 'Yes'
                                            : 'No'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t px-6 py-4">
                        <Link href={`/products/${product.id}/edit`}>
                            <Button size="sm">
                                <Pencil size={14} /> Edit
                            </Button>
                        </Link>
                        <Link href={`/design-studio/${['mug', 'shirt', 'tote', 'pin', 'calendar', 'sticker'].includes(product.viewer_type) ? product.viewer_type : 'mug'}`}>
                            <Button size="sm" variant="secondary">
                                <Cuboid size={14} /> Design Studio
                            </Button>
                        </Link>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => {
                                if (confirm('Archive this product?'))
                                    router.delete(
                                        `/products/${product.id}`,
                                    );
                            }}
                        >
                            <Trash2 size={14} /> Archive
                        </Button>
                        <Link href="/products" className="ml-auto">
                            <Button size="sm" variant="ghost">
                                Back to list
                            </Button>
                        </Link>
                    </div>
                </div>
        </>
    );
}

ShowProduct.layout = {
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
            title: 'Details',
            href: '/products',
        },
    ],
};
