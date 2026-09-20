<?php

namespace App\Services\Product;

use App\Repositories\ProductRepositoryInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductService
{
    public function __construct(protected ProductRepositoryInterface $products) {}

    public function create(array $attributes): mixed
    {
        $attributes['slug'] = $this->ensureSlug($attributes);
        $attributes = $this->storeReferenceImage($attributes);
        $attributes = $this->normalize($attributes);

        return $this->products->create($attributes);
    }

    public function update(mixed $product, array $attributes): bool
    {
        if (isset($attributes['name']) && empty($attributes['slug'])) {
            $attributes['slug'] = Str::slug($attributes['name']);
        }
        $attributes = $this->storeReferenceImage($attributes);
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

    /**
     * Persist an uploaded reference image (products/create "reference → 3D")
     * to the public disk and reuse it as thumbnail/fallback so the saved
     * product keeps pointing at the actual product artwork.
     * The `reference_image` key is never a DB column, so always unset it.
     */
    private function storeReferenceImage(array $attributes): array
    {
        if (isset($attributes['reference_image']) && $attributes['reference_image'] instanceof UploadedFile) {
            $path = $attributes['reference_image']->store('products/references', 'public');
            $url = Storage::url($path);

            // The uploaded photo is the actual product artwork, so it becomes
            // the thumbnail; keep an existing fallback_image if one was set.
            $attributes['thumbnail'] = $url;
            if (empty($attributes['fallback_image'] ?? null)) {
                $attributes['fallback_image'] = $url;
            }
        }

        unset($attributes['reference_image']);

        return $attributes;
    }

    private function normalize(array $attributes, mixed $product = null): array
    {
        // Customizable off -> reset 3D/custom flags to safe defaults
        if (array_key_exists('is_customizable', $attributes) && ! $attributes['is_customizable']) {
            $attributes['viewer_type'] = 'none';
            $attributes['has_3d_preview'] = false;
        }

        // Cleared number/text inputs arrive as explicit null via validation,
        // but the columns are NOT NULL — fall back to the DB defaults instead
        // of crashing with a 1048 integrity violation on MySQL.
        foreach (['stock_quantity' => 0, 'sort_order' => 0, 'unit' => 'piece'] as $key => $default) {
            if (array_key_exists($key, $attributes) && $attributes[$key] === null) {
                $attributes[$key] = $default;
            }
        }

        return $attributes;
    }
}
