import { Head, Link, useForm, router } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { ArrowLeft, CheckCircle2, Clock, MapPin, PackageCheck, Phone, Mail, Truck, User, XCircle, ExternalLink } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface OrderItemDetail {
    id: number;
    product_name: string;
    category?: string | null;
    sku?: string | null;
    banner_image?: string | null;
    viewer_type?: string | null;
    selected_color?: string | null;
    selected_color_name?: string | null;
    selected_size?: string | null;
    customization?: any;
    base_price: number | string;
    addon_price: number | string;
    unit_price: number | string;
    quantity: number;
    total_price: number | string;
}

interface OrderDetail {
    id: number;
    order_number: string;
    customer_id?: number | null;
    customer_name: string;
    customer_email: string;
    customer_phone?: string | null;
    status: 'in_progress' | 'processing' | 'delivered' | 'cancelled' | string;
    placed_at: string;
    expected_delivery?: string | null;
    subtotal: number | string;
    customization_total: number | string;
    shipping_fee: number | string;
    discount_total: number | string;
    total: number | string;
    payment_method: string;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | string;
    courier_name?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    tracking_steps?: { label: string; subtitle?: string; state: 'done' | 'active' | 'pending' }[];
    shipping_address?: any;
    notes?: string | null;
    items?: OrderItemDetail[];
}

export default function ShowOrder({ order }: { order: OrderDetail }) {
    const { data, setData, post, processing, errors } = useForm({
        status: order.status,
        payment_status: order.payment_status,
        courier_name: order.courier_name ?? 'J&T Express',
        tracking_number: order.tracking_number ?? '',
        tracking_url: order.tracking_url ?? '',
        notes: order.notes ?? '',
    });

    const submitStatusUpdate = (e: FormEvent) => {
        e.preventDefault();
        post(`/orders/${order.id}/status`);
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete Order #${order.order_number}?`)) {
            router.delete(`/orders/${order.id}`);
        }
    };

    const inputCls =
        'h-8 rounded-none border border-[#D1D5DB] bg-white px-2.5 text-xs font-normal text-[#1A1C1E] placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0';

    return (
        <div className="font-sans text-[#1A1C1E]">
            <Head title={`Order #${order.order_number} — Admin`} />

            {/* HEADER */}
            <div className="mb-4 border-b border-[#E5E7EB] pb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Link href="/orders">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-[#D1D5DB] bg-white">
                            <ArrowLeft size={14} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-[#1A1C1E]">Order #{order.order_number}</h1>
                            <span className="font-mono text-xs text-muted-foreground">
                                Placed on {new Date(order.placed_at).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-xs text-[#6B7280]">
                            Customer: <strong className="text-[#1A1C1E]">{order.customer_name}</strong> ({order.customer_email})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={handleDelete} className="h-8 rounded-none px-3 text-xs font-normal">
                        Delete Order
                    </Button>
                </div>
            </div>

            {/* 3-COLUMN LAYOUT */}
            <div className="grid gap-3 xl:grid-cols-3">
                {/* LEFT 2 COLUMNS — Items & Customization Details */}
                <div className="xl:col-span-2 space-y-3">
                    {/* ORDERED ITEMS */}
                    <section className="rounded-none border border-[#E5E7EB] bg-white p-4">
                        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-[#1A1C1E] border-b border-[#E5E7EB] pb-1">
                            Ordered Merchandise & Print Customizations ({order.items?.length || 0})
                        </h3>

                        <div className="space-y-3">
                            {order.items?.map((item) => (
                                <div key={item.id} className="border border-[#E5E7EB] p-3 bg-[#F9FAFB] grid gap-2 sm:grid-cols-4">
                                    <div className="sm:col-span-3 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-[#1A1C1E] text-xs">
                                                {item.quantity}x
                                            </span>
                                            <h4 className="font-bold text-[#1A1C1E] text-sm">{item.product_name}</h4>
                                            {item.sku && <span className="font-mono text-[10px] text-muted-foreground">[{item.sku}]</span>}
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#4B5563]">
                                            {item.category && <span className="bg-white border border-[#D1D5DB] px-1.5 py-0.5">{item.category}</span>}
                                            {item.selected_color_name && <span className="bg-white border border-[#D1D5DB] px-1.5 py-0.5">Color: {item.selected_color_name}</span>}
                                            {item.selected_size && <span className="bg-white border border-[#D1D5DB] px-1.5 py-0.5">Size: {item.selected_size}</span>}
                                        </div>

                                        {/* CUSTOMIZATION SPECS */}
                                        {item.customization && Object.keys(item.customization).length > 0 && (
                                            <div className="mt-2 border-t border-[#D1D5DB] pt-1.5 text-xs">
                                                <p className="font-mono text-[10px] uppercase font-bold text-emerald-800">Print Customization Details:</p>
                                                <div className="mt-1 space-y-0.5 font-mono text-[11px] text-[#1A1C1E] bg-white p-2 border border-[#E5E7EB]">
                                                    {item.customization.custom_text && (
                                                        <p><strong>Custom Text:</strong> "{item.customization.custom_text}"</p>
                                                    )}
                                                    {item.customization.text_font && (
                                                        <p><strong>Font / Style:</strong> {item.customization.text_font}</p>
                                                    )}
                                                    {item.customization.text_color && (
                                                        <p><strong>Text Color:</strong> {item.customization.text_color}</p>
                                                    )}
                                                    {item.customization.image_url && (
                                                        <div className="mt-1">
                                                            <p><strong>Uploaded Graphic:</strong></p>
                                                            <img src={item.customization.image_url} alt="Proof" className="mt-1 h-20 w-20 object-contain border border-[#D1D5DB] bg-gray-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="font-mono text-right sm:border-l sm:border-[#E5E7EB] sm:pl-3 flex flex-col justify-center">
                                        <p className="text-[10px] text-[#6B7280]">Unit Price: ₱{Number(item.unit_price).toFixed(2)}</p>
                                        {Number(item.addon_price) > 0 && (
                                            <p className="text-[10px] text-emerald-700">+ Addon ₱{Number(item.addon_price).toFixed(2)}</p>
                                        )}
                                        <p className="font-bold text-sm text-[#1A1C1E] mt-1">
                                            ₱{Number(item.total_price).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* CUSTOMER & SHIPPING ADDRESS */}
                    <section className="rounded-none border border-[#E5E7EB] bg-white p-4">
                        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-[#1A1C1E] border-b border-[#E5E7EB] pb-1 flex items-center gap-1.5">
                            <MapPin size={14} className="text-[#1A1C1E]" /> Customer & Delivery Address (Philippine Hierarchy)
                        </h3>

                        <div className="grid gap-3 sm:grid-cols-2 font-sans text-xs">
                            <div className="border border-[#E5E7EB] p-3 bg-[#F9FAFB] space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-sm text-[#1A1C1E]">
                                    <User size={14} /> {order.customer_name}
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-xs text-[#4B5563]">
                                    <Mail size={12} /> {order.customer_email}
                                </div>
                                {order.customer_phone && (
                                    <div className="flex items-center gap-1.5 font-mono text-xs text-[#4B5563]">
                                        <Phone size={12} /> {order.customer_phone}
                                    </div>
                                )}
                            </div>

                            <div className="border border-[#E5E7EB] p-3 bg-[#F9FAFB] space-y-1 font-mono text-xs">
                                <span className="block text-[10px] font-bold text-[#6B7280] uppercase">Philippine Shipping Address:</span>
                                <p className="font-bold text-[#1A1C1E]">
                                    {order.shipping_address?.recipient_name || order.customer_name}
                                </p>
                                <p className="text-[#374151] leading-snug">
                                    {order.shipping_address?.formatted_address ||
                                        [
                                            order.shipping_address?.street_address,
                                            order.shipping_address?.barangay_name,
                                            order.shipping_address?.city_name,
                                            order.shipping_address?.province_name,
                                            order.shipping_address?.region_name,
                                        ]
                                            .filter(Boolean)
                                            .join(', ') ||
                                        'Standard Customer Address'}
                                </p>
                                {order.notes && (
                                    <p className="mt-1 text-[10px] text-amber-800 italic bg-amber-50 p-1 border border-amber-200">
                                        Notes: {order.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN — Fulfillment Status & Courier Settings */}
                <div className="space-y-3">
                    {/* STATUS UPDATE FORM */}
                    <form onSubmit={submitStatusUpdate} className="rounded-none border border-[#E5E7EB] bg-white p-4 font-mono text-xs space-y-3">
                        <h3 className="uppercase tracking-wider text-[#1A1C1E] border-b border-[#E5E7EB] pb-1 font-bold">
                            Fulfillment & Courier Settings
                        </h3>

                        <div className="space-y-1">
                            <p className="text-[10px] text-[#6B7280]">Fulfillment Status</p>
                            <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                <SelectTrigger className="h-8 rounded-none border-[#D1D5DB] text-xs font-mono w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                                    <SelectItem value="processing" className="text-xs">Printing / Processing</SelectItem>
                                    <SelectItem value="delivered" className="text-xs">Delivered</SelectItem>
                                    <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-[#6B7280]">Payment Status</p>
                            <Select value={data.payment_status} onValueChange={(v) => setData('payment_status', v)}>
                                <SelectTrigger className="h-8 rounded-none border-[#D1D5DB] text-xs font-mono w-full">
                                    <SelectValue placeholder="Select Payment Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                                    <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                                    <SelectItem value="refunded" className="text-xs">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-[#6B7280]">Courier Name</p>
                            <Input
                                value={data.courier_name}
                                onChange={(e) => setData('courier_name', e.target.value)}
                                placeholder="e.g. J&T Express, Lalamove, Flash"
                                className={inputCls}
                            />
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-[#6B7280]">Tracking Number</p>
                            <Input
                                value={data.tracking_number}
                                onChange={(e) => setData('tracking_number', e.target.value)}
                                placeholder="e.g. JT-99824125PH"
                                className={inputCls}
                            />
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-[#6B7280]">Tracking URL</p>
                            <Input
                                value={data.tracking_url}
                                onChange={(e) => setData('tracking_url', e.target.value)}
                                placeholder="https://..."
                                className={inputCls}
                            />
                        </div>

                        <Button type="submit" disabled={processing} className="h-8 rounded-none bg-[#1A1C1E] text-white hover:bg-black w-full text-xs font-mono">
                            {processing ? 'Saving Changes...' : 'Update Order Status'}
                        </Button>

                        {data.tracking_url && (
                            <a href={data.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline pt-1">
                                <ExternalLink size={11} /> Open Tracking Link
                            </a>
                        )}
                    </form>

                    {/* TRACKING STEPS TIMELINE */}
                    {order.tracking_steps && order.tracking_steps.length > 0 && (
                        <section className="rounded-none border border-[#E5E7EB] bg-white p-4 font-mono text-xs">
                            <h3 className="mb-3 uppercase tracking-wider text-[#1A1C1E] font-bold border-b border-[#E5E7EB] pb-1">
                                Order Tracking Progress
                            </h3>

                            <div className="space-y-2.5">
                                {order.tracking_steps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div className="mt-0.5 shrink-0">
                                            {step.state === 'done' && <CheckCircle2 size={14} className="text-emerald-600" />}
                                            {step.state === 'active' && <Clock size={14} className="text-blue-600" />}
                                            {step.state === 'pending' && <div className="h-3 w-3 rounded-full border border-gray-300 bg-gray-100" />}
                                        </div>
                                        <div>
                                            <p className={`font-semibold text-xs ${step.state === 'done' ? 'text-emerald-800' : step.state === 'active' ? 'text-blue-800' : 'text-gray-400'}`}>
                                                {step.label}
                                            </p>
                                            {step.subtitle && <p className="text-[10px] text-gray-500">{step.subtitle}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* FINANCIAL SUMMARY */}
                    <section className="rounded-none border border-[#E5E7EB] bg-white p-4 font-mono text-xs space-y-1.5">
                        <h3 className="mb-2 uppercase tracking-wider text-[#1A1C1E] font-bold border-b border-[#E5E7EB] pb-1">
                            Financial Summary
                        </h3>

                        <div className="flex justify-between text-[#6B7280]">
                            <span>Items Subtotal:</span>
                            <span>₱{Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(order.customization_total) > 0 && (
                            <div className="flex justify-between text-emerald-800">
                                <span>Customization Addons:</span>
                                <span>+₱{Number(order.customization_total).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[#6B7280]">
                            <span>Shipping Fee:</span>
                            <span>₱{Number(order.shipping_fee).toFixed(2)}</span>
                        </div>
                        {Number(order.discount_total) > 0 && (
                            <div className="flex justify-between text-red-700">
                                <span>Discount:</span>
                                <span>-₱{Number(order.discount_total).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-[#1A1C1E] border-t border-[#E5E7EB] pt-1.5">
                            <span>Total Amount:</span>
                            <span>₱{Number(order.total).toFixed(2)}</span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

ShowOrder.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Orders', href: '/orders' },
        { title: 'Order Details', href: '/orders' },
    ],
};
