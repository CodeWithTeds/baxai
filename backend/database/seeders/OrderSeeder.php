<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        if (Order::count() > 0) {
            return;
        }

        $customer = Customer::first();
        $customerId = $customer?->id;
        $customerEmail = $customer?->email ?? 'customer@placides.com';
        $customerName = $customer?->name ?? 'Demo Customer';

        $products = Product::all();
        $shirt = $products->firstWhere('viewer_type', 'shirt') ?? $products->first();
        $mug = $products->firstWhere('viewer_type', 'mug') ?? $products->skip(1)->first();
        $pin = $products->firstWhere('viewer_type', 'pin_cloud') ?? $products->skip(2)->first();

        // ── Order 1 (In Progress) ──────────────────────────────────────────
        $order1 = Order::create([
            'order_number' => 'RD-8829',
            'customer_id' => $customerId,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'status' => 'in_progress',
            'placed_at' => now()->subHours(8),
            'expected_delivery' => now()->addDays(3)->format('M d'),
            'subtotal' => 198.00,
            'customization_total' => 30.00,
            'shipping_fee' => 0.00,
            'discount_total' => 0.00,
            'total' => 198.00,
            'payment_method' => 'Cash on Delivery',
            'payment_status' => 'pending',
            'tracking_steps' => [
                ['label' => 'Order Placed', 'subtitle' => now()->subHours(8)->format('M d, h:i A'), 'state' => 'done'],
                ['label' => 'Finishing & Packaging', 'subtitle' => 'Custom text decal in production', 'state' => 'active'],
                ['label' => 'Shipped', 'subtitle' => 'Pending courier handover', 'state' => 'pending'],
                ['label' => 'Delivered', 'subtitle' => 'Expected ' . now()->addDays(3)->format('M d'), 'state' => 'pending'],
            ],
            'shipping_address' => [
                'recipient' => $customerName,
                'address' => '123 Rizal St, Barangay 5',
                'city' => 'Manila',
                'postal_code' => '1000',
            ],
            'notes' => 'Please package carefully with protective bubble wrap.',
        ]);

        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $mug?->id,
            'product_name' => $mug?->name ?? 'Custom Ceramic Coffee Mug',
            'category' => 'Drinkware',
            'sku' => $mug?->sku ?? 'MUG-001',
            'banner_image' => $mug?->thumbnail ?? $mug?->fallback_image,
            'viewer_type' => 'mug',
            'selected_color' => '#FFFFFF',
            'selected_color_name' => 'Classic White',
            'selected_size' => '11 oz',
            'customization' => [
                'text' => 'Placides Coffee Co.',
                'fontFamily' => 'Impact, Arial Black, sans-serif',
                'textColor' => '#111827',
                'placement' => 'front',
            ],
            'base_price' => 99.00,
            'addon_price' => 0.00,
            'unit_price' => 99.00,
            'quantity' => 2,
            'total_price' => 198.00,
        ]);

        // ── Order 2 (Processing) ───────────────────────────────────────────
        $order2 = Order::create([
            'order_number' => 'RD-8830',
            'customer_id' => $customerId,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'status' => 'processing',
            'placed_at' => now()->subDay(),
            'expected_delivery' => now()->addDays(4)->format('M d'),
            'subtotal' => 350.00,
            'customization_total' => 50.00,
            'shipping_fee' => 0.00,
            'discount_total' => 0.00,
            'total' => 350.00,
            'payment_method' => 'GCash / Online',
            'payment_status' => 'paid',
            'tracking_steps' => [
                ['label' => 'Order Placed', 'subtitle' => now()->subDay()->format('M d, h:i A'), 'state' => 'done'],
                ['label' => 'Printing & Curing', 'subtitle' => 'Direct-to-garment press in progress', 'state' => 'active'],
                ['label' => 'Shipped', 'subtitle' => 'Pending pickup', 'state' => 'pending'],
                ['label' => 'Delivered', 'subtitle' => 'Estimated ' . now()->addDays(4)->format('M d'), 'state' => 'pending'],
            ],
            'shipping_address' => [
                'recipient' => $customerName,
                'address' => '789 Quezon Ave',
                'city' => 'Quezon City',
                'postal_code' => '1100',
            ],
        ]);

        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => $shirt?->id,
            'product_name' => $shirt?->name ?? 'Custom Heavyweight T-Shirt',
            'category' => 'Apparel',
            'sku' => $shirt?->sku ?? 'TEE-001',
            'banner_image' => $shirt?->thumbnail ?? $shirt?->fallback_image,
            'viewer_type' => 'shirt',
            'selected_color' => '#111827',
            'selected_color_name' => 'Midnight Black',
            'selected_size' => 'L',
            'customization' => [
                'text' => 'Baxai Studio 2026',
                'fontFamily' => 'Georgia, serif',
                'textColor' => '#FFFFFF',
                'placement' => 'front',
            ],
            'base_price' => 350.00,
            'addon_price' => 0.00,
            'unit_price' => 350.00,
            'quantity' => 1,
            'total_price' => 350.00,
        ]);

        // ── Order 3 (Delivered / Past) ─────────────────────────────────────
        $order3 = Order::create([
            'order_number' => 'RD-8790',
            'customer_id' => $customerId,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'status' => 'delivered',
            'placed_at' => now()->subDays(6),
            'expected_delivery' => now()->subDays(2)->format('M d'),
            'subtotal' => 180.00,
            'customization_total' => 0.00,
            'shipping_fee' => 0.00,
            'discount_total' => 0.00,
            'total' => 180.00,
            'payment_method' => 'Cash on Delivery',
            'payment_status' => 'paid',
            'tracking_steps' => [
                ['label' => 'Order Placed', 'subtitle' => now()->subDays(6)->format('M d, h:i A'), 'state' => 'done'],
                ['label' => 'Production & Enameling', 'subtitle' => 'Completed', 'state' => 'done'],
                ['label' => 'Shipped', 'subtitle' => now()->subDays(3)->format('M d, h:i A'), 'state' => 'done'],
                ['label' => 'Delivered', 'subtitle' => now()->subDays(2)->format('M d, h:i A') . ' • Signed', 'state' => 'done'],
            ],
            'shipping_address' => [
                'recipient' => $customerName,
                'address' => '123 Rizal St, Barangay 5',
                'city' => 'Manila',
                'postal_code' => '1000',
            ],
        ]);

        OrderItem::create([
            'order_id' => $order3->id,
            'product_id' => $pin?->id,
            'product_name' => $pin?->name ?? 'Custom Enamel Button Pins',
            'category' => 'Pins & Badges',
            'sku' => $pin?->sku ?? 'PIN-001',
            'banner_image' => $pin?->thumbnail ?? $pin?->fallback_image,
            'viewer_type' => 'pin_cloud',
            'selected_color' => '#FFFFFF',
            'selected_size' => 'Classic Round (2.25")',
            'customization' => [
                'placement' => 'Classic Round',
            ],
            'base_price' => 45.00,
            'addon_price' => 0.00,
            'unit_price' => 45.00,
            'quantity' => 4,
            'total_price' => 180.00,
        ]);
    }
}
