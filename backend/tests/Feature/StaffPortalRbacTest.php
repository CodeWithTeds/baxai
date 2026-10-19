<?php

use App\Models\Customer;
use App\Models\Order;
use App\Models\Task;
use App\Models\User;

test('staff user can access the staff portal workspace', function () {
    $staff = User::factory()->create(['role' => 'staff']);

    $response = $this->actingAs($staff)->get(route('staff.portal'));

    $response->assertOk();
});

test('staff user is redirected to staff portal when accessing dashboard', function () {
    $staff = User::factory()->create(['role' => 'staff']);

    $response = $this->actingAs($staff)->get(route('dashboard'));

    $response->assertRedirect(route('staff.portal'));
});

test('staff user is blocked from accessing staff management (user management)', function () {
    $staff = User::factory()->create(['role' => 'staff']);

    $response = $this->actingAs($staff)->get(route('staff.index'));

    $response->assertRedirect(route('staff.portal'));
    $response->assertSessionHas('error');
});

test('staff user is blocked from accessing audit logs', function () {
    $staff = User::factory()->create(['role' => 'staff']);

    $response = $this->actingAs($staff)->get(route('audit-logs.index'));

    $response->assertRedirect(route('staff.portal'));
    $response->assertSessionHas('error');
});

test('staff user is blocked from accessing system settings', function () {
    $staff = User::factory()->create(['role' => 'staff']);

    $response = $this->actingAs($staff)->get(route('profile.edit'));

    $response->assertRedirect(route('staff.portal'));
    $response->assertSessionHas('error');
});

test('staff user cannot delete customer records', function () {
    $staff = User::factory()->create(['role' => 'staff']);
    $customer = Customer::create([
        'name' => 'John Sample',
        'customer_code' => 'CUST-TEST-001',
        'email' => 'john.sample@example.com',
        'status' => 'active',
        'type' => 'retail',
    ]);

    $response = $this->actingAs($staff)->delete(route('customers.destroy', $customer));

    $response->assertRedirect(route('customers.index'));
    $response->assertSessionHas('error', 'Staff members are not authorized to delete records.');
    expect(Customer::find($customer->id))->not->toBeNull();
});

test('staff user can transition order fulfillment status', function () {
    $staff = User::factory()->create(['role' => 'staff']);
    $order = Order::create([
        'order_number' => 'ORD-STAFF-001',
        'customer_name' => 'Fulfillment Test',
        'customer_email' => 'fulfill@example.com',
        'status' => 'in_progress',
        'subtotal' => 1500,
        'total' => 1500,
        'payment_status' => 'paid',
    ]);

    $response = $this->actingAs($staff)->post(route('staff.portal.order-status', $order->id), [
        'status' => 'processing',
    ]);

    $response->assertSessionHas('success');
    expect($order->fresh()->status)->toBe('processing');
});

test('staff user can create and toggle workstation task', function () {
    $staff = User::factory()->create(['role' => 'staff']);

    $createResponse = $this->actingAs($staff)->post(route('staff.portal.store-task'), [
        'title' => 'Check Heat Press Calibration',
    ]);

    $createResponse->assertSessionHas('success');
    $task = Task::where('user_id', $staff->id)->first();
    expect($task)->not->toBeNull();
    expect($task->status)->toBe('pending');

    $toggleResponse = $this->actingAs($staff)->post(route('staff.portal.toggle-task', $task->id));
    $toggleResponse->assertSessionHas('success');
    expect($task->fresh()->status)->toBe('completed');
});

test('admin user has unrestricted access to dashboard, staff management, audit logs and settings', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->get(route('dashboard'))->assertOk();
    $this->actingAs($admin)->get(route('staff.index'))->assertOk();
    $this->actingAs($admin)->get(route('audit-logs.index'))->assertOk();
    $this->actingAs($admin)->get(route('profile.edit'))->assertOk();
});
