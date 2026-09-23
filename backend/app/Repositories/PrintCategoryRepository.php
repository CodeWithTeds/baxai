<?php

namespace App\Repositories;

use App\Models\PrintCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PrintCategoryRepository implements PrintCategoryRepositoryInterface
{
    public function all(): Collection
    {
        return PrintCategory::withCount('printItems')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return QueryBuilder::for(PrintCategory::class)
            ->withCount('printItems')
            ->allowedFilters(
                AllowedFilter::partial('search', 'name'),
                AllowedFilter::exact('status'),
                AllowedFilter::partial('code')
            )
            ->allowedSorts('name', 'code', 'status', 'created_at', 'sort_order')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findById(int $id): ?PrintCategory
    {
        return PrintCategory::with('printItems')->find($id);
    }

    public function create(array $data): PrintCategory
    {
        return PrintCategory::create($data);
    }

    public function update(PrintCategory $category, array $data): bool
    {
        return $category->update($data);
    }

    public function delete(PrintCategory $category): bool
    {
        return (bool) $category->delete();
    }

    public function getStats(): array
    {
        return [
            'total' => PrintCategory::count(),
            'active' => PrintCategory::where('status', 'active')->count(),
            'inactive' => PrintCategory::where('status', 'inactive')->count(),
        ];
    }
}
