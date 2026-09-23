<?php

namespace App\Repositories;

use App\Models\PrintItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PrintItemRepositoryInterface
{
    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator;

    public function findById(int $id): ?PrintItem;

    public function create(array $data): PrintItem;

    public function update(PrintItem $item, array $data): bool;

    public function delete(PrintItem $item): bool;

    public function bulkDelete(array $ids): int;

    public function getStats(): array;
}
