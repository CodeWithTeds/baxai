<?php

namespace App\Repositories;

use App\Models\PrintItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PrintItemRepository implements PrintItemRepositoryInterface
{
    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return QueryBuilder::for(PrintItem::class)
            ->with('category')
            ->allowedFilters(
                AllowedFilter::partial('search', 'name'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('category_id'),
                AllowedFilter::exact('print_sides'),
                AllowedFilter::exact('color_mode'),
                AllowedFilter::partial('item_code'),
                AllowedFilter::partial('paper_type'),
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
        return PrintItem::create($data);
    }

    public function update(PrintItem $item, array $data): bool
    {
        return $item->update($data);
    }

    public function delete(PrintItem $item): bool
    {
        return (bool) $item->delete();
    }

    public function bulkDelete(array $ids): int
    {
        return PrintItem::whereIn('id', $ids)->delete();
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
