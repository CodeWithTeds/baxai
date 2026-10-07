<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create([
            'email_verified_at' => now(),
        ]);
    }

    public function test_processing_without_courier_and_tracking_fails_validation()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-001',
            'status' => 'in_progress',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'processing',
            'courier_name' => '',
            'tracking_number' => '',
        ]);

        $response->assertSessionHasErrors(['courier_name', 'tracking_number']);
        $order->refresh();
        $this->assertEquals('in_progress', $order->status);
    }

    public function test_delivered_without_tracking_number_fails_validation()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-002',
            'status' => 'processing',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
            'courier_name' => 'J&T Express',
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'delivered',
            'courier_name' => 'J&T Express',
            'tracking_number' => '',
        ]);

        $response->assertSessionHasErrors(['tracking_number']);
        $order->refresh();
        $this->assertEquals('processing', $order->status);
    }

    public function test_cancelled_without_notes_fails_validation()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-003',
            'status' => 'in_progress',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'cancelled',
            'notes' => '',
        ]);

        $response->assertSessionHasErrors(['notes']);
        $order->refresh();
        $this->assertEquals('in_progress', $order->status);
    }

    public function test_delivered_order_cannot_change_status_terminal_lock()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-004',
            'status' => 'delivered',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-12345678',
            'delivered_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'processing',
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-12345678',
        ]);

        $response->assertSessionHasErrors(['status']);
        $order->refresh();
        $this->assertEquals('delivered', $order->status);
    }

    public function test_delivered_order_cannot_be_cancelled()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-005',
            'status' => 'delivered',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
            'delivered_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'cancelled',
            'notes' => 'Customer changed mind',
        ]);

        $response->assertSessionHasErrors(['status']);
        $this->assertEquals('Delivered orders cannot be cancelled.', session('errors')->get('status')[0]);
        $order->refresh();
        $this->assertEquals('delivered', $order->status);
    }

    public function test_cancelled_order_cannot_change_status()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-006',
            'status' => 'cancelled',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
            'cancelled_at' => now(),
            'cancellation_reason' => 'Duplicate order',
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'in_progress',
        ]);

        $response->assertSessionHasErrors(['status']);
        $order->refresh();
        $this->assertEquals('cancelled', $order->status);
    }

    public function test_happy_path_in_progress_to_processing_succeeds()
    {
        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-VAL-007',
            'status' => 'in_progress',
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'subtotal' => 1000,
            'total' => 1000,
        ]);

        $response = $this->actingAs($this->admin)->post("/orders/{$order->id}/status", [
            'status' => 'processing',
            'courier_name' => 'Lalamove',
            'tracking_number' => 'LLM-5551234',
            'tracking_url' => 'https://lalamove.com/track/LLM-5551234',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
        $response->assertSessionHas('success', 'Order status updated successfully.');

        $order->refresh();
        $this->assertEquals('processing', $order->status);
        $this->assertEquals('Lalamove', $order->courier_name);
        $this->assertEquals('LLM-5551234', $order->tracking_number);
        $this->assertEquals('https://lalamove.com/track/LLM-5551234', $order->tracking_url);
    }

    public function test_bulk_update_rejects_batch_if_any_order_is_terminal()
    {
        $order1 = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-BULK-001',
            'status' => 'in_progress',
            'customer_name' => 'Customer 1',
            'customer_email' => 'c1@example.com',
            'subtotal' => 500,
            'total' => 500,
        ]);

        $order2 = Order::create([
            'user_id' => $this->admin->id,
            'order_number' => 'ORD-BULK-002',
            'status' => 'delivered',
            'customer_name' => 'Customer 2',
            'customer_email' => 'c2@example.com',
            'subtotal' => 500,
            'total' => 500,
            'delivered_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->post('/orders/bulk-update-status', [
            'ids' => [$order1->id, $order2->id],
            'status' => 'processing',
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-BULK-001',
        ]);

        $response->assertSessionHasErrors(['ids']);
        $order1->refresh();
        $order2->refresh();

        // Strict batch check: Neither order should be updated
        $this->assertEquals('in_progress', $order1->status);
        $this->assertEquals('delivered', $order2->status);
    }
}
