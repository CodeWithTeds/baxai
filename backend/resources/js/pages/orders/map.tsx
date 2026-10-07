import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    MapPin,
    PackageCheck,
    Search,
    ShoppingBag,
    XCircle,
    ExternalLink,
    X,
    User,
    Mail,
    Phone,
    Truck,
    ArrowRight,
    Loader2,
    Calendar,
    CreditCard,
    DollarSign,
} from 'lucide-react';
import MapView, { MapMarker } from '@/components/Map/MapView';

interface OrderItem {
    id: number;
    product_name: string;
    quantity: number;
    total_price: number | string;
    unit_price?: number | string;
}

interface OrderData {
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string | null;
    status: 'in_progress' | 'processing' | 'delivered' | 'cancelled' | string;
    payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | string;
    placed_at: string;
    total: number | string;
    subtotal?: number | string;
    shipping_fee?: number | string;
    courier_name?: string | null;
    tracking_number?: string | null;
    shipping_address?: any;
    customer_address?: {
        id: number;
        latitude?: number | null;
        longitude?: number | null;
        street_address?: string;
        formatted_address?: string;
        barangay_name?: string;
        city_name?: string;
        province_name?: string;
        region_name?: string;
    } | null;
    customerAddress?: {
        id: number;
        latitude?: number | null;
        longitude?: number | null;
        street_address?: string;
        formatted_address?: string;
        barangay_name?: string;
        city_name?: string;
        province_name?: string;
        region_name?: string;
    } | null;
    items?: OrderItem[];
}

export default function OrdersMapPage({ orders = [] }: { orders: OrderData[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const safeOrders = Array.isArray(orders) ? orders : [];

    const filteredOrders = useMemo(() => {
        return safeOrders.filter((o) => {
            if (statusFilter !== 'all' && o.status !== statusFilter) return false;
            if (search.trim()) {
                const s = search.toLowerCase();
                const num = o.order_number.toLowerCase();
                const name = o.customer_name.toLowerCase();
                const email = o.customer_email.toLowerCase();
                return num.includes(s) || name.includes(s) || email.includes(s);
            }
            return true;
        });
    }, [safeOrders, statusFilter, search]);

    const markers: MapMarker[] = useMemo(() => {
        return filteredOrders
            .map((order): MapMarker | null => {
                const addr = order.customerAddress || order.customer_address;
                const lat = typeof addr?.latitude === 'number' ? addr.latitude : order.shipping_address?.latitude;
                const lng = typeof addr?.longitude === 'number' ? addr.longitude : order.shipping_address?.longitude;

                if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                    return {
                        id: order.id,
                        latitude: Number(lat),
                        longitude: Number(lng),
                        label: `Order #${order.order_number}`,
                        subtitle: `${order.customer_name} • ₱${Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                        href: `/orders/${order.id}`,
                        status: order.status,
                    };
                }
                return null;
            })
            .filter((m): m is MapMarker => m !== null);
    }, [filteredOrders]);

    const stats = useMemo(() => {
        return {
            total: safeOrders.length,
            mapped: markers.length,
            in_progress: safeOrders.filter((o) => o.status === 'in_progress').length,
            processing: safeOrders.filter((o) => o.status === 'processing').length,
            delivered: safeOrders.filter((o) => o.status === 'delivered').length,
            cancelled: safeOrders.filter((o) => o.status === 'cancelled').length,
        };
    }, [safeOrders, markers]);

    const handleAdvanceStatus = (order: OrderData, nextStatus: string) => {
        setStatusUpdating(true);
        router.post(
            `/orders/${order.id}/status`,
            { status: nextStatus },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setStatusUpdating(false);
                    setSelectedOrder((prev) => (prev && prev.id === order.id ? { ...prev, status: nextStatus } : prev));
                },
                onError: () => setStatusUpdating(false),
            }
        );
    };

    const getNextStatus = (currentStatus: string): { key: string; label: string; color: string; icon: any } | null => {
        switch (currentStatus) {
            case 'in_progress':
                return { key: 'processing', label: 'Advance to Processing', color: 'bg-purple-600 hover:bg-purple-700 text-white', icon: PackageCheck };
            case 'processing':
                return { key: 'delivered', label: 'Advance to Delivered', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: CheckCircle2 };
            default:
                return null;
        }
    };

    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'delivered':
                return (
                    <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        <CheckCircle2 size={11} className="text-emerald-600" /> Delivered
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 border border-purple-300 bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-purple-800">
                        <PackageCheck size={11} className="text-purple-600" /> Processing
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-700">
                        <XCircle size={11} className="text-red-600" /> Cancelled
                    </span>
                );
            case 'in_progress':
            default:
                return (
                    <span className="inline-flex items-center gap-1 border border-blue-300 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-800">
                        <Clock size={11} className="text-blue-600" /> In Progress
                    </span>
                );
        }
    };

    const renderPaymentBadge = (pst?: string) => {
        switch (pst) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-800">
                        Paid
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-red-800">
                        Failed
                    </span>
                );
            case 'refunded':
                return (
                    <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-800">
                        Refunded
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1 border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-700">
                        Pending
                    </span>
                );
        }
    };

    return (
        <div className="flex h-[calc(100vh-80px)] flex-col font-sans text-[#1A1C1E]">
            <Head title="Live Orders Map (3D) — Admin" />

            {/* TOP BAR / CONTROL HEADER */}
            <div className="border-b border-[#E5E7EB] bg-white p-2.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Link href="/orders">
                            <Button variant="outline" size="sm" className="h-8 rounded-none border-[#D1D5DB] bg-white text-xs font-mono">
                                <ArrowLeft size={13} className="mr-1" />
                                Orders Table
                            </Button>
                        </Link>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#1A1C1E]">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span>Live 3D Delivery Map</span>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 border border-blue-200">
                                {markers.length} Mapped / {safeOrders.length} Total
                            </span>
                        </div>
                    </div>

                    {/* STATUS FILTER PILLS */}
                    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-2 py-1 text-[11px] border transition-colors ${statusFilter === 'all' ? 'border-[#1A1C1E] bg-[#1A1C1E] text-white font-bold' : 'border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]'}`}
                        >
                            All ({safeOrders.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('in_progress')}
                            className={`px-2 py-1 text-[11px] border transition-colors flex items-center gap-1 ${statusFilter === 'in_progress' ? 'border-blue-600 bg-blue-600 text-white font-bold' : 'border-[#D1D5DB] bg-white text-blue-700 hover:bg-blue-50'}`}
                        >
                            <Clock size={10} /> In Progress ({stats.in_progress})
                        </button>
                        <button
                            onClick={() => setStatusFilter('processing')}
                            className={`px-2 py-1 text-[11px] border transition-colors flex items-center gap-1 ${statusFilter === 'processing' ? 'border-purple-600 bg-purple-600 text-white font-bold' : 'border-[#D1D5DB] bg-white text-purple-700 hover:bg-purple-50'}`}
                        >
                            <PackageCheck size={10} /> Processing ({stats.processing})
                        </button>
                        <button
                            onClick={() => setStatusFilter('delivered')}
                            className={`px-2 py-1 text-[11px] border transition-colors flex items-center gap-1 ${statusFilter === 'delivered' ? 'border-emerald-600 bg-emerald-600 text-white font-bold' : 'border-[#D1D5DB] bg-white text-emerald-700 hover:bg-emerald-50'}`}
                        >
                            <CheckCircle2 size={10} /> Delivered ({stats.delivered})
                        </button>
                        <button
                            onClick={() => setStatusFilter('cancelled')}
                            className={`px-2 py-1 text-[11px] border transition-colors flex items-center gap-1 ${statusFilter === 'cancelled' ? 'border-red-600 bg-red-600 text-white font-bold' : 'border-[#D1D5DB] bg-white text-red-700 hover:bg-red-50'}`}
                        >
                            <XCircle size={10} /> Cancelled ({stats.cancelled})
                        </button>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-48 sm:w-64">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8A8FA3]" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter order #, customer..."
                            className="h-7 rounded-none border-[#D1D5DB] pl-8 text-[11px] font-mono placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0"
                        />
                    </div>
                </div>
            </div>

            {/* FULL VIEWPORT MAP CONTAINER + FLOATING OVERLAYS */}
            <div className="relative flex-1 w-full overflow-hidden bg-slate-900">
                <MapView
                    markers={markers}
                    height="100%"
                    className="h-full w-full"
                    zoom={11}
                    initialStyle="3d-liberty"
                    onMarkerClick={(marker) => {
                        const found = safeOrders.find((o) => o.id === Number(marker.id));
                        if (found) {
                            setSelectedOrder(found);
                        }
                    }}
                />

                {/* FLOATING LEGEND / HUD */}
                <div className="absolute bottom-4 left-4 z-10 border border-[#374151] bg-[#111827]/90 p-3 text-white backdrop-blur font-mono text-xs shadow-lg max-w-xs">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-1 mb-2">
                        Delivery Pin Legend
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                            <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
                            <span>Processing / Printing</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                            <span>Delivered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                            <span>Cancelled</span>
                        </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700 text-[10px] text-slate-400">
                        Click any pin to inspect & advance order status
                    </div>
                </div>

                {/* PIN-CLICK ORDER PREVIEW DRAWER / SLIDE-OVER PANEL */}
                {selectedOrder && (
                    <div className="absolute top-3 right-3 bottom-3 z-30 flex w-96 max-w-[calc(100vw-24px)] flex-col border border-[#D1D5DB] bg-white shadow-2xl animate-in slide-in-from-right duration-200">
                        {/* DRAWER HEADER */}
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] p-3">
                            <div className="flex items-center gap-2">
                                <div className="font-mono text-sm font-bold text-[#1A1C1E]">
                                    Order #{selectedOrder.order_number}
                                </div>
                                <div>{renderStatusBadge(selectedOrder.status)}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedOrder(null)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* DRAWER BODY (SCROLLABLE) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
                            {/* CUSTOMER INFO */}
                            <div className="border border-[#E5E7EB] bg-white p-3 space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] border-b border-[#F3F4F6] pb-1">
                                    Customer Details
                                </div>
                                <div className="space-y-1 text-[#1A1C1E]">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <User size={13} className="text-blue-600" />
                                        <span>{selectedOrder.customer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Mail size={12} className="text-slate-400" />
                                        <a href={`mailto:${selectedOrder.customer_email}`} className="hover:underline text-blue-600">
                                            {selectedOrder.customer_email}
                                        </a>
                                    </div>
                                    {selectedOrder.customer_phone && (
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Phone size={12} className="text-slate-400" />
                                            <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">
                                                {selectedOrder.customer_phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* DELIVERY ADDRESS */}
                            <div className="border border-[#E5E7EB] bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6B7280] border-b border-[#F3F4F6] pb-1">
                                    <span>Philippine Delivery Destination</span>
                                    <MapPin size={11} className="text-red-500" />
                                </div>
                                <div className="text-xs text-[#374151] leading-relaxed">
                                    {(() => {
                                        const addr = selectedOrder.customerAddress || selectedOrder.customer_address;
                                        const formatted = addr?.formatted_address || selectedOrder.shipping_address?.formatted_address;
                                        const fallback = [
                                            addr?.street_address || selectedOrder.shipping_address?.street_address,
                                            addr?.barangay_name || selectedOrder.shipping_address?.barangay_name,
                                            addr?.city_name || selectedOrder.shipping_address?.city_name,
                                            addr?.province_name || selectedOrder.shipping_address?.province_name,
                                            addr?.region_name || selectedOrder.shipping_address?.region_name,
                                        ]
                                            .filter(Boolean)
                                            .join(', ');

                                        return formatted || fallback || 'Standard Customer Address';
                                    })()}
                                </div>
                            </div>

                            {/* FINANCIAL & ORDER SUMMARY */}
                            <div className="border border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-2">
                                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Total Amount</span>
                                    <span className="text-sm font-bold text-blue-700">
                                        ₱{Number(selectedOrder.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} className="text-slate-400" /> Placed Date:
                                    </span>
                                    <span>{new Date(selectedOrder.placed_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <CreditCard size={12} className="text-slate-400" /> Payment:
                                    </span>
                                    <span>{renderPaymentBadge(selectedOrder.payment_status)}</span>
                                </div>
                            </div>

                            {/* ORDER ITEMS LIST */}
                            <div className="border border-[#E5E7EB] bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6B7280] border-b border-[#F3F4F6] pb-1">
                                    <span className="flex items-center gap-1">
                                        <ShoppingBag size={11} className="text-blue-600" /> Items Breakdown
                                    </span>
                                    <span>{selectedOrder.items?.length || 0} items</span>
                                </div>
                                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-[#F3F4F6]">
                                        {selectedOrder.items.map((item) => (
                                            <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="font-medium text-[#1A1C1E] truncate">{item.product_name}</div>
                                                    <div className="text-[10px] text-slate-500">Qty: {item.quantity}</div>
                                                </div>
                                                <div className="font-bold text-[#1A1C1E] whitespace-nowrap">
                                                    ₱{Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-slate-500 italic">No specific items listed</div>
                                )}
                            </div>

                            {/* COURIER / TRACKING (IF AVAILABLE) */}
                            {(selectedOrder.courier_name || selectedOrder.tracking_number) && (
                                <div className="border border-[#E5E7EB] bg-blue-50/50 p-2.5 text-[11px] space-y-1">
                                    <div className="flex items-center gap-1 font-bold text-blue-900">
                                        <Truck size={12} /> Fulfillment Courier
                                    </div>
                                    <div className="text-slate-700">
                                        {selectedOrder.courier_name && <span>{selectedOrder.courier_name}</span>}
                                        {selectedOrder.tracking_number && (
                                            <span className="font-mono text-slate-500 ml-1.5">
                                                (#{selectedOrder.tracking_number})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DRAWER FOOTER / QUICK ADVANCE & ACTIONS */}
                        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-2 font-mono">
                            {/* ADVANCE STATUS ACTION */}
                            {(() => {
                                const next = getNextStatus(selectedOrder.status);
                                if (next) {
                                    const Icon = next.icon;
                                    return (
                                        <Button
                                            type="button"
                                            disabled={statusUpdating}
                                            onClick={() => handleAdvanceStatus(selectedOrder, next.key)}
                                            className={`w-full rounded-none text-xs font-bold font-mono h-9 ${next.color}`}
                                        >
                                            {statusUpdating ? (
                                                <Loader2 size={13} className="mr-1.5 animate-spin" />
                                            ) : (
                                                <Icon size={13} className="mr-1.5" />
                                            )}
                                            {next.label}
                                        </Button>
                                    );
                                } else if (selectedOrder.status === 'delivered') {
                                    return (
                                        <div className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                            Delivery Completed
                                        </div>
                                    );
                                } else {
                                    return (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={statusUpdating}
                                            onClick={() => handleAdvanceStatus(selectedOrder, 'in_progress')}
                                            className="w-full rounded-none text-xs font-mono h-9 border-[#D1D5DB]"
                                        >
                                            Re-open as In Progress
                                        </Button>
                                    );
                                }
                            })()}

                            {/* VIEW FULL ORDER LINK */}
                            <Link href={`/orders/${selectedOrder.id}`} className="block">
                                <Button
                                    variant="outline"
                                    className="w-full rounded-none text-xs font-mono h-8 border-[#D1D5DB] bg-white text-[#1A1C1E] hover:bg-slate-100"
                                >
                                    <span>View Full Order Details</span>
                                    <ExternalLink size={12} className="ml-1.5 text-blue-600" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
