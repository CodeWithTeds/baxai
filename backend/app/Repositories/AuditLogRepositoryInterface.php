<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface AuditLogRepositoryInterface
{
    /**
     * Get paginated audit logs based on search, module, severity, date range, archive status, and sort filters.
     */
    public function paginated(array $filters = [], int $perPage = 25): LengthAwarePaginator;

    /**
     * Get summary metrics for the audit logs dashboard.
     */
    public function getStats(): array;

    /**
     * Archive (soft-delete) an audit log.
     */
    public function archiveLog(int $id): bool;

    /**
     * Restore (unarchive) an audit log.
     */
    public function restoreLog(int $id): bool;

    /**
     * Bulk archive (soft-delete) audit logs.
     */
    public function bulkArchive(array $ids): int;

    /**
     * Bulk restore (unarchive) audit logs.
     */
    public function bulkRestore(array $ids): int;

    /**
     * Revert / undo an entity state change captured in an audit log.
     */
    public function undoChange(int $id, User $actor): array;

    /**
     * Re-apply / redo an entity state change captured in an audit log.
     */
    public function redoChange(int $id, User $actor): array;

    /**
     * Safely archive audit logs older than a given number of days (no hard delete).
     */
    public function purgeOldLogs(int $days = 90): int;
}
