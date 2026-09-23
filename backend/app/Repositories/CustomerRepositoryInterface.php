<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CustomerRepositoryInterface extends BaseRepositoryInterface
{
    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator;

    public function bulkUpdateStatus(array $ids, string $status): int;

    public function bulkDelete(array $ids): int;

    public function getStats(): array;
}
