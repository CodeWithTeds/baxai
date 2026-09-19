<?php

use App\Models\Product;
use App\Models\User;

it('creates a product via api', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Custom Ceramic Mug 11oz',
        'category' => 'mugs',
        'status' => 'active',
        'base_price' => 9.99,
        'sku' => 'MUG-TEST-001',
        'is_customizable' => true,
        'viewer_type' => 'mug',
        'has_3d_preview' => true,
    ]);

    $response->assertCreated()->assertJsonPath('data.sku', 'MUG-TEST-001');
});

it('lists products with pagination', function (): void {
    $user = User::factory()->create();
    Product::factory()->count(3)->create();

    $this->actingAs($user)->getJson('/api/v1/products?per_page=10')->assertOk();
});

it('bulk archives products', function (): void {
    $user = User::factory()->create();
    $products = Product::factory()->count(2)->create(['status' => 'active']);

    $response = $this->actingAs($user)->postJson('/api/v1/products/bulk-archive', [
        'ids' => $products->pluck('id')->toArray(),
    ]);

    $response->assertOk()->assertJsonPath('data.count', 2);
});
