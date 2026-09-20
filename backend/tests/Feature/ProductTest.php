<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

it('stores an uploaded reference image as the product thumbnail', function (): void {
    Storage::fake('public');
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->post('/products', [
        'name' => 'Photo Mug',
        'category' => 'mugs',
        'status' => 'draft',
        'base_price' => 9.99,
        'sku' => 'MUG-REF-001',
        'viewer_type' => 'mug',
        'has_3d_preview' => true,
        'is_customizable' => true,
        'reference_image' => UploadedFile::fake()->image('reference.jpg', 800, 600),
    ]);

    $response->assertRedirect();

    $product = Product::where('sku', 'MUG-REF-001')->firstOrFail();
    expect($product->thumbnail)->toStartWith('/storage/products/references/');
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $product->thumbnail));
});

it('accepts procedural vessel viewer types', function (): void {
    $user = User::factory()->create();

    foreach (['glass_cup', 'tumbler', 'travel_mug', 'coffee_cup', 'teacup', 'espresso', 'latte', 'cappuccino', 'stein', 'tankard'] as $i => $viewer) {
        $response = $this->actingAs($user)->postJson('/api/v1/products', [
            'name' => "Vessel {$viewer}",
            'category' => 'mugs',
            'status' => 'active',
            'base_price' => 9.99,
            'sku' => "VESSEL-{$i}",
            'is_customizable' => true,
            'viewer_type' => $viewer,
            'has_3d_preview' => true,
        ]);

        $response->assertCreated()->assertJsonPath('data.viewer_type', $viewer);
    }
});

it('bulk archives products via the web routes with an Inertia redirect', function (): void {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $products = Product::factory()->count(2)->create(['status' => 'active']);

    // Must NOT hit /api/v1/* via Inertia: stateless API + Gate denial there
    // used to come back as JSON {"This action is unauthorized."}, which the
    // Inertia client rejects with "must receive a valid Inertia response".
    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true'])
        ->post('/products/bulk-archive', [
            'ids' => $products->pluck('id')->toArray(),
        ]);

    $response->assertRedirect(route('products.index'));

    foreach ($products as $product) {
        expect($product->refresh()->status)->toBe('archived');
    }
});

it('falls back to defaults when sort and stock are cleared', function (): void {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->post('/products', [
        'name' => 'Cleared Numbers Mug',
        'category' => 'mugs',
        'status' => 'draft',
        'base_price' => 9.99,
        'sku' => 'MUG-CLEARED-001',
        'stock_quantity' => null,
        'sort_order' => null,
        'unit' => null,
    ]);

    $response->assertRedirect();

    $product = Product::where('sku', 'MUG-CLEARED-001')->firstOrFail();
    expect($product->stock_quantity)->toBe(0)
        ->and($product->sort_order)->toBe(0)
        ->and($product->unit)->toBe('piece');
});

it('redirects back with friendly errors when required fields are missing', function (): void {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->from('/products/create')->post('/products', [
        'category' => 'mugs',
        'status' => 'draft',
    ]);

    $response->assertRedirect('/products/create');
    $response->assertSessionHasErrors([
        'name' => 'Please enter a product name.',
        'sku' => 'Please enter a SKU.',
        'base_price' => 'Please enter a base price.',
    ]);
    expect(Product::count())->toBe(0);
});

it('rejects a compare-at price below the base price with a clear message', function (): void {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->from('/products/create')->post('/products', [
        'name' => 'Bad Pricing Mug',
        'category' => 'mugs',
        'status' => 'draft',
        'base_price' => 100,
        'compare_at_price' => 50,
        'sku' => 'MUG-BAD-PRICE-001',
    ]);

    $response->assertRedirect('/products/create');
    $response->assertSessionHasErrors([
        'compare_at_price' => 'Compare-at price must be higher than the base price.',
    ]);
});
