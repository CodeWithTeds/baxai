<?php

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductRepository extends BaseRepository implements ProductRepositoryInterface
{
    public function __construct(Product $model)
    {
        parent::__construct($model);
    }

    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        // NOTE: do NOT Cache::remember() a LengthAwarePaginator here.
        // Serialized paginators unserialize to __PHP_Incomplete_Class after
        // deploys / model changes, causing the exact TypeError you hit.
        return QueryBuilder::for(Product::class)
            ->allowedFilters(
                'name',
                'sku',
                'status',
                'category',
                'badge',
                'viewer_type',
                AllowedFilter::exact('is_customizable'),
                AllowedFilter::exact('has_3d_preview'),
                AllowedFilter::exact('is_featured_home'),
                AllowedFilter::exact('is_featured_services'),
                AllowedFilter::scope('active'),
                AllowedFilter::scope('customizable'),
            )
            ->allowedSorts('name', 'base_price', 'stock_quantity', 'sort_order', 'created_at', 'updated_at')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends(request()->query());
    }

    public function find(mixed $id): Model
    {
        return Product::query()->findOrFail($id);
    }

    public function create(array $attributes): Model
    {
        return parent::create($attributes);
    }

    public function update(Model $model, array $attributes): bool
    {
        return parent::update($model, $attributes);
    }

    public function delete(Model $model): bool
    {
        return parent::delete($model);
    }

    public function bulkUpdateStatus(array $ids, string $status): int
    {
        return Product::whereIn('id', $ids)->update(['status' => $status]);
    }

    public function bulkDelete(array $ids): int
    {
        $count = 0;
        Product::whereIn('id', $ids)->chunkById(100, function ($products) use (&$count): void {
            foreach ($products as $product) {
                $product->delete();
                $count++;
            }
        });

        return $count;
    }
}
