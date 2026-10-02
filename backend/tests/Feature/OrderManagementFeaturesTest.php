<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderManagementFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_creation_assigns_courier_and_tracking()
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $customer = Customer::create([
            'customer_code' => 'CUST-001',
            'user_id' => $user->id,
            'name' => 'Maria Clara',
            'email' => $user->email,
        ]);

        CustomerAddress::create([
            'customer_id' => $customer->id,
            'recipient_name' => 'Maria Clara',
            'phone_number' => '09171234567',
            'region_code' => '1300000000',
            'region_name' => 'National Capital Region (NCR)',
            'province_code' => '1300000000',
            'province_name' => 'Metro Manila',
            'city_code' => '1380600000',
            'city_name' => 'City of Manila',
            'barangay_code' => '1380600001',
            'barangay_name' => 'Barangay 1',
            'street_address' => '123 Rizal Avenue',
            'postal_code' => '1000',
            'is_default' => true,
        ]);

        $product = Product::factory()->create([
            'base_price' => 250,
            'stock_quantity' => 20,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', [
            'customer_email' => $user->email,
            'customer_id' => $customer->id,
            'shipping_method' => 'standard',
            'payment_method' => 'Cash on Delivery',
            'items' => [
                [
                    'name' => 'Custom Tote Bag',
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => 250,
                ],
            ],
        ]);

        $response->assertStatus(201);
        $orderData = $response->json('order') ?? $response->json('data');

        $this->assertNotEmpty($orderData['courier_name']);
        $this->assertNotEmpty($orderData['tracking_number']);
        $this->assertNotEmpty($orderData['tracking_url']);
        $this->assertTrue($orderData['can_cancel']);
    }

    public function test_customer_can_cancel_order_and_inventory_is_restored()
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $product = Product::factory()->create([
            'stock_quantity' => 15,
        ]);

        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-TEST-001',
            'status' => 'processing',
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'subtotal' => 500,
            'total' => 500,
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-99999999PH',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 3,
            'unit_price' => 250,
            'total_price' => 750,
        ]);

        $cancelResponse = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$order->id}/cancel", [
            'reason' => 'Customer requested cancellation via mobile app',
        ]);

        $cancelResponse->assertStatus(200);
        $cancelResponse->assertJson([
            'status' => 'success',
            'message' => 'Order #ORD-TEST-001 has been cancelled successfully.',
        ]);

        $order->refresh();
        $this->assertEquals('cancelled', $order->status);
        $this->assertNotNull($order->cancelled_at);
        $this->assertEquals('Customer requested cancellation via mobile app', $order->cancellation_reason);

        // Product inventory should be restored (+3)
        $product->refresh();
        $this->assertEquals(18, $product->stock_quantity);
    }

    public function test_cannot_cancel_already_delivered_order()
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $deliveredOrder = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-DEL-001',
            'status' => 'delivered',
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'subtotal' => 300,
            'total' => 300,
            'delivered_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$deliveredOrder->id}/cancel");
        $response->assertStatus(422);
        $response->assertJson([
            'status' => 'error',
            'message' => 'Delivered orders cannot be cancelled.',
        ]);
    }

    public function test_cancelling_already_cancelled_order_returns_info()
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $alreadyCancelledOrder = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-CANC-001',
            'status' => 'cancelled',
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'subtotal' => 300,
            'total' => 300,
            'cancelled_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$alreadyCancelledOrder->id}/cancel");
        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'info',
            'message' => 'Order is already cancelled.',
        ]);
    }
}
