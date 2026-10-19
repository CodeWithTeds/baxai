<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated admin can visit the dashboard', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('authenticated staff are redirected to staff portal from dashboard', function () {
    $staff = User::factory()->create(['role' => 'staff']);
    $this->actingAs($staff);

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('staff.portal'));
});
