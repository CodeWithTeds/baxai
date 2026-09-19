<?php

namespace App\Services\Product;

use App\Repositories\ProductRepositoryInterface;
use Illuminate\Support\Str;

class ProductService
{
    public function __construct(protected ProductRepositoryInterface $products) {}

    public function create(array $attributes): mixed
    {
        $attributes['slug'] = $this->ensureSlug($attributes);
        $attributes = $this->normalize($attributes);

        return $this->products->create($attributes);
    }

    public function update(mixed $product, array $attributes): bool
    {
        if (isset($attributes['name']) && empty($attributes['slug'])) {
            $attributes['slug'] = Str::slug($attributes['name']);
        }
        $attributes = $this->normalize($attributes, $product);

        return $this->products->update($product, $attributes);
    }

    public function activate(array $ids): int
    {
        return $this->products->bulkUpdateStatus($ids, 'active');
    }

    public function deactivate(array $ids): int
    {
        return $this->products->bulkUpdateStatus($ids, 'inactive');
    }

    public function archive(array $ids): int
    {
        return $this->products->bulkUpdateStatus($ids, 'archived');
    }

    private function ensureSlug(array $attributes): string
    {
        if (! empty($attributes['slug'])) {
            return Str::slug($attributes['slug']);
        }

        return Str::slug($attributes['name'] ?? Str::random(8));
    }

    private function normalize(array $attributes, mixed $product = null): array
    {
        // Customizable off -> reset 3D/custom flags to safe defaults
        if (array_key_exists('is_customizable', $attributes) && ! $attributes['is_customizable']) {
            $attributes['viewer_type'] = 'none';
            $attributes['has_3d_preview'] = false;
        }

        return $attributes;
    }
}
