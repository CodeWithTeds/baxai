<?php

use App\Models\Discount;
use App\Models\User;

test('authenticated user can view discounts page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/discounts');

    $response->assertStatus(200);
});

test('authenticated user can create a discount coupon', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/discounts', [
        'code' => 'TEST10',
        'name' => '10% Test Offer',
        'type' => 'percentage',
        'value' => 10,
        'min_order_amount' => 100,
        'status' => 'active',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('discounts', [
        'code' => 'TEST10',
        'name' => '10% Test Offer',
    ]);
});

test('can test coupon calculator', function () {
    $user = User::factory()->create();

    Discount::create([
        'code' => 'TEST20',
        'name' => '20% Deal',
        'type' => 'percentage',
        'value' => 20,
        'min_order_amount' => 500,
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->postJson('/discounts/calculate', [
        'code' => 'TEST20',
        'order_amount' => 1000,
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'valid' => true,
            'discount_amount' => 200,
            'final_total' => 800,
        ]);
});
