<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderInventoryTest extends TestCase
{
    use RefreshDatabase;

    private function makeCustomer(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $customer = Customer::create([
            'customer_code' => 'CUST-'.uniqid(),
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

        return [$user, $customer];
    }

    private function orderPayload(Customer $customer, array $items): array
    {
        return [
            'customer_email' => $customer->email,
            'customer_id' => $customer->id,
            'payment_method' => 'Cash on Delivery',
            'items' => $items,
        ];
    }

    public function test_order_creation_deducts_stock()
    {
        [$user, $customer] = $this->makeCustomer();
        $product = Product::factory()->create(['stock_quantity' => 20]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', $this->orderPayload($customer, [
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 3, 'unit_price' => 250],
        ]));

        $response->assertStatus(201);
        $product->refresh();
        $this->assertEquals(17, $product->stock_quantity);
    }

    public function test_order_exceeding_available_stock_is_rejected_without_deducting()
    {
        [$user, $customer] = $this->makeCustomer();
        $product = Product::factory()->create(['stock_quantity' => 3]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', $this->orderPayload($customer, [
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 5, 'unit_price' => 250],
        ]));

        $response->assertStatus(422);
        $response->assertJson([
            'status' => 'error',
            'error_code' => 'INSUFFICIENT_STOCK',
            'product_id' => $product->id,
            'requested' => 5,
            'available' => 3,
        ]);

        // No order and no stock change on failure
        $this->assertEquals(0, Order::count());
        $product->refresh();
        $this->assertEquals(3, $product->stock_quantity);
    }

    public function test_duplicate_product_lines_are_aggregated_for_stock_check()
    {
        [$user, $customer] = $this->makeCustomer();
        $product = Product::factory()->create(['stock_quantity' => 4]);

        // 3 + 3 = 6 requested across two lines, only 4 available
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', $this->orderPayload($customer, [
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 3, 'unit_price' => 250],
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 3, 'unit_price' => 250],
        ]));

        $response->assertStatus(422);
        $this->assertEquals(0, Order::count());
        $product->refresh();
        $this->assertEquals(4, $product->stock_quantity);
    }

    public function test_non_tracked_products_do_not_affect_stock()
    {
        [$user, $customer] = $this->makeCustomer();
        $product = Product::factory()->create([
            'stock_quantity' => 1,
            'track_inventory' => false,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', $this->orderPayload($customer, [
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 5, 'unit_price' => 250],
        ]));

        $response->assertStatus(201);
        $product->refresh();
        $this->assertEquals(1, $product->stock_quantity);
    }

    public function test_cancelling_order_restores_stock()
    {
        [$user, $customer] = $this->makeCustomer();
        $product = Product::factory()->create(['stock_quantity' => 10]);

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', $this->orderPayload($customer, [
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 4, 'unit_price' => 250],
        ]));
        $create->assertStatus(201);
        $product->refresh();
        $this->assertEquals(6, $product->stock_quantity);

        $orderId = $create->json('order.id') ?? $create->json('data.id');

        $cancel = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$orderId}/cancel", [
            'reason' => 'Changed mind',
        ]);
        $cancel->assertStatus(200);

        $product->refresh();
        $this->assertEquals(10, $product->stock_quantity);
    }

    public function test_delivered_order_keeps_stock_deducted()
    {
        [$user, $customer] = $this->makeCustomer();
        $product = Product::factory()->create(['stock_quantity' => 10]);

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/orders', $this->orderPayload($customer, [
            ['name' => $product->name, 'product_id' => $product->id, 'quantity' => 4, 'unit_price' => 250],
        ]));
        $create->assertStatus(201);
        $orderId = $create->json('order.id') ?? $create->json('data.id');

        $status = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$orderId}/status", [
            'status' => 'processing',
        ]);
        $status->assertStatus(200);

        $status = $this->actingAs($user, 'sanctum')->postJson("/api/v1/orders/{$orderId}/status", [
            'status' => 'delivered',
        ]);
        $status->assertStatus(200);

        // Delivered orders must not restore inventory
        $product->refresh();
        $this->assertEquals(6, $product->stock_quantity);
    }
}
