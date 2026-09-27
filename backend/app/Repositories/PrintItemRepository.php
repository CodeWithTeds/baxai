<?php

namespace App\Repositories;

use App\Models\PrintItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PrintItemRepository implements PrintItemRepositoryInterface
{
    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return QueryBuilder::for(PrintItem::class)
            ->with('category')
            ->allowedFilters(
                AllowedFilter::callback('search', function ($query, $value) {
                    $term = "%{$value}%";
                    $query->where(function ($q) use ($term) {
                        $q->where('name', 'like', $term)
                          ->orWhere('item_code', 'like', $term)
                          ->orWhere('paper_type', 'like', $term)
                          ->orWhere('brand', 'like', $term)
                          ->orWhere('model', 'like', $term)
                          ->orWhere('compatibility', 'like', $term);
                    });
                }),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('category_id'),
                AllowedFilter::callback('category_code', function ($query, $value) {
                    $query->whereHas('category', function ($q) use ($value) {
                        $q->where('code', $value)->orWhere('slug', $value);
                    });
                }),
                AllowedFilter::exact('print_sides'),
                AllowedFilter::exact('color_mode'),
                AllowedFilter::partial('item_code'),
                AllowedFilter::partial('paper_type'),
                AllowedFilter::partial('brand'),
                AllowedFilter::partial('model'),
                AllowedFilter::callback('min_price', function ($query, $value) {
                    $query->where('base_price', '>=', (float) $value);
                }),
                AllowedFilter::callback('max_price', function ($query, $value) {
                    $query->where('base_price', '<=', (float) $value);
                })
            )
            ->allowedSorts('name', 'item_code', 'status', 'base_price', 'min_quantity', 'created_at', 'sort_order')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findById(int $id): ?PrintItem
    {
        return PrintItem::with('category')->find($id);
    }

    public function create(array $data): PrintItem
    {
        return DB::transaction(fn () => PrintItem::create($data));
    }

    public function update(PrintItem $item, array $data): bool
    {
        return DB::transaction(fn () => $item->update($data));
    }

    public function delete(PrintItem $item): bool
    {
        return DB::transaction(fn () => (bool) $item->delete());
    }

    public function bulkUpdateStatus(array $ids, string $status): int
    {
        return DB::transaction(fn () => PrintItem::whereIn('id', $ids)->update(['status' => $status]));
    }

    public function bulkDelete(array $ids): int
    {
        return DB::transaction(fn () => PrintItem::whereIn('id', $ids)->delete());
    }

    public function getStats(): array
    {
        return [
            'total' => PrintItem::count(),
            'active' => PrintItem::where('status', 'active')->count(),
            'draft' => PrintItem::where('status', 'draft')->count(),
            'inactive' => PrintItem::where('status', 'inactive')->count(),
            'categories' => \App\Models\PrintCategory::count(),
        ];
    }
}
