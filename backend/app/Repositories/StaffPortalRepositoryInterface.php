<?php

namespace App\Repositories;

use App\Models\Task;
use App\Models\User;

interface StaffPortalRepositoryInterface
{
    /**
     * Get aggregated workspace data for the authenticated staff user.
     */
    public function getStaffWorkspaceData(User $user): array;

    /**
     * Update order status during fulfillment.
     */
    public function updateOrderStatus(int $orderId, string $status): bool;

    /**
     * Toggle or update task completion status.
     */
    public function toggleTaskStatus(int $taskId, int $userId): bool;

    /**
     * Create a workstation task for staff member.
     */
    public function createTask(User $user, array $data): Task;
}
