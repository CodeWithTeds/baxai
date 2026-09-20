import { Head, Link, router, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Product3DPreview from '@/components/product-3d-preview';
import { CheckCircle2, Cuboid, Pencil, Trash2 } from 'lucide-react';
import { dashboard } from '@/routes';

export default function ShowProduct({ product }: { product: any }) {
    const { flash } = usePage().props as unknown as { flash?: { success?: string } };
    return (
        <>
            <Head title={product.name} />
            {flash?.success && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-600" /> {flash.success}
                </div>
            )}
            <div className="overflow-hidden rounded-xl border bg-card">
                    {(product.thumbnail || (product.has_3d_preview && product.viewer_type !== 'none')) && (
                        <div className="grid gap-4 border-b p-6 sm:grid-cols-2">
                            {product.thumbnail && (
                                <div>
                                    <p className="mb-2 text-[12px] font-medium text-gray-400">REFERENCE IMAGE</p>
                                    <img
                                        src={product.thumbnail}
                                        alt={product.name}
                                        className="max-h-64 w-full rounded-lg border object-contain bg-gray-50"
                                    />
                                </div>
                            )}
                            {product.has_3d_preview && product.viewer_type !== 'none' && (
                                <div>
                                    <p className="mb-2 text-[12px] font-medium text-gray-400">3D MODEL</p>
                                    <Product3DPreview
                                        viewerType={product.viewer_type}
                                        label={product.name}
                                        modelUrl={product.model_3d_url}
                                        designImageUrl={product.thumbnail}
                                    />
                                </div>
                            )}
                        </div>
                    )}
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
                        <Link href={`/design-studio/${['mug', 'shirt', 'tote', 'pin', 'calendar', 'sticker'].includes(product.viewer_type) || String(product.viewer_type ?? '').startsWith('shirt_') ? product.viewer_type : 'mug'}`}>
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
