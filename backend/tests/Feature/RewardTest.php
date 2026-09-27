<?php

use App\Models\Customer;
use App\Models\Reward;
use App\Models\User;

test('authenticated user can view rewards page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/rewards');

    $response->assertStatus(200);
});

test('authenticated user can create a reward perk', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/rewards/perks', [
        'title' => 'Test Free Sample',
        'code' => 'RWD-TEST',
        'points_required' => 150,
        'reward_type' => 'free_sample',
        'status' => 'active',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('rewards', [
        'code' => 'RWD-TEST',
        'title' => 'Test Free Sample',
    ]);
});

test('can adjust customer points', function () {
    $user = User::factory()->create();
    $customer = Customer::create([
        'name' => 'John Doe',
        'customer_code' => 'CUST-TEST-01',
        'email' => 'john@example.com',
        'loyalty_points' => 100,
        'vip_tier' => 'Bronze',
    ]);

    $response = $this->actingAs($user)->post('/rewards/adjust-points', [
        'customer_id' => $customer->id,
        'points' => 200,
        'reason' => 'Testing points add',
    ]);

    $response->assertRedirect();
    $this->assertEquals(300, $customer->fresh()->loyalty_points);
});
