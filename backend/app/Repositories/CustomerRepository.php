<?php

namespace App\Repositories;

use App\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CustomerRepository extends BaseRepository implements CustomerRepositoryInterface
{
    public function __construct(Customer $model)
    {
        parent::__construct($model);
    }

    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return QueryBuilder::for(Customer::class)
            ->allowedFilters(
                'name',
                'email',
                'phone',
                'company',
                'customer_code',
                'city',
                'status',
                'type',
                AllowedFilter::callback('search', function ($query, $value): void {
                    $query->where(function ($q) use ($value): void {
                        $term = "%{$value}%";
                        $q->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term)
                            ->orWhere('customer_code', 'like', $term)
                            ->orWhere('phone', 'like', $term)
                            ->orWhere('company', 'like', $term)
                            ->orWhere('city', 'like', $term);
                    });
                }),
                AllowedFilter::callback('min_spent', fn ($query, $value) => $query->where('total_spent', '>=', (float) $value)),
                AllowedFilter::callback('max_spent', fn ($query, $value) => $query->where('total_spent', '<=', (float) $value)),
                AllowedFilter::callback('min_orders', fn ($query, $value) => $query->where('total_orders', '>=', (int) $value)),
                AllowedFilter::scope('active'),
                AllowedFilter::scope('lead')
            )
            ->allowedSorts('name', 'customer_code', 'email', 'total_orders', 'total_spent', 'sort_order', 'created_at', 'updated_at')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends(request()->query());
    }

    public function find(mixed $id): Model
    {
        return Customer::query()->findOrFail($id);
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
        return Customer::whereIn('id', $ids)->update(['status' => $status]);
    }

    public function bulkDelete(array $ids): int
    {
        $count = 0;
        Customer::whereIn('id', $ids)->chunkById(100, function ($customers) use (&$count): void {
            foreach ($customers as $customer) {
                $customer->delete();
                $count++;
            }
        });

        return $count;
    }

    public function getStats(): array
    {
        return [
            'total' => Customer::count(),
            'active' => Customer::where('status', 'active')->count(),
            'lead' => Customer::where('status', 'lead')->count(),
            'vip' => Customer::where('type', 'vip')->count(),
        ];
    }
}
