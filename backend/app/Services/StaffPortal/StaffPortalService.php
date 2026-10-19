<?php

namespace App\Services\StaffPortal;

use App\Enums\StaffFulfillmentStatusEnum;
use App\Models\Task;
use App\Models\User;
use App\Repositories\StaffPortalRepositoryInterface;
use InvalidArgumentException;

class StaffPortalService
{
    public function __construct(
        protected StaffPortalRepositoryInterface $repository
    ) {}

    /**
     * Retrieve complete operational workspace payload.
     */
    public function getWorkspace(User $user): array
    {
        return $this->repository->getStaffWorkspaceData($user);
    }

    /**
     * Transition order status safely during fulfillment.
     */
    public function updateOrderStatus(int $orderId, string $status): bool
    {
        $allowed = array_column(StaffFulfillmentStatusEnum::cases(), 'value');
        if (! in_array($status, $allowed, true)) {
            throw new InvalidArgumentException("Invalid order fulfillment status: {$status}");
        }

        return $this->repository->updateOrderStatus($orderId, $status);
    }

    /**
     * Toggle workstation task status.
     */
    public function toggleTask(int $taskId, User $user): bool
    {
        return $this->repository->toggleTaskStatus($taskId, $user->id);
    }

    /**
     * Create a task for staff shift checklist.
     */
    public function createTask(User $user, array $validated): Task
    {
        return $this->repository->createTask($user, $validated);
    }
}
