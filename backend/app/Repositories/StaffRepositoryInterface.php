<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface StaffRepositoryInterface extends BaseRepositoryInterface
{
    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator;

    public function findWithProfile(mixed $id): User;

    public function createStaff(array $data): User;

    public function updateStaff(User $user, array $data): bool;

    public function deleteStaff(User $user): bool;

    public function toggleStatus(User $user): bool;

    public function bulkUpdateStatus(array $ids, bool $isActive): int;

    public function bulkDelete(array $ids): int;

    public function getStats(): array;

    public function generateNextEmployeeId(): string;
}
