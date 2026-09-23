<?php

namespace App\Repositories;

use App\Models\PrintCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface PrintCategoryRepositoryInterface
{
    public function all(): Collection;

    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator;

    public function findById(int $id): ?PrintCategory;

    public function create(array $data): PrintCategory;

    public function update(PrintCategory $category, array $data): bool;

    public function delete(PrintCategory $category): bool;

    public function getStats(): array;
}
