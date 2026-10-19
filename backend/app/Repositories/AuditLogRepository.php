<?php

namespace App\Repositories;

use App\Models\AuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AuditLogRepository implements AuditLogRepositoryInterface
{
    public function paginated(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $filter = $filters['filter'] ?? [];
        $status = $filter['status'] ?? 'active';

        // Archive status scoping
        if ($status === 'archived') {
            $query = AuditLog::onlyTrashed();
        } elseif ($status === 'all_with_archived') {
            $query = AuditLog::withTrashed();
        } else {
            $query = AuditLog::query();
        }

        $query->with([
            'user:id,name,username,email,role,avatar',
            'undoneBy:id,name,email,role',
        ]);

        // Text Search
        if (!empty($filter['search'])) {
            $term = trim((string) $filter['search']);
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', "%{$term}%")
                    ->orWhere('action', 'like', "%{$term}%")
                    ->orWhere('module', 'like', "%{$term}%")
                    ->orWhere('user_name', 'like', "%{$term}%")
                    ->orWhere('user_email', 'like', "%{$term}%")
                    ->orWhere('ip_address', 'like', "%{$term}%")
                    ->orWhere('entity_type', 'like', "%{$term}%");
            });
        }

        // Module Filter
        if (!empty($filter['module']) && $filter['module'] !== 'all') {
            $query->where('module', $filter['module']);
        }

        // Severity Filter
        if (!empty($filter['severity']) && $filter['severity'] !== 'all') {
            $query->where('severity', $filter['severity']);
        }

        // Undone / State Filter
        if (!empty($filter['state']) && $filter['state'] !== 'all') {
            if ($filter['state'] === 'undone') {
                $query->where('is_undone', true);
            } elseif ($filter['state'] === 'active_delta') {
                $query->where('is_undone', false);
            }
        }

        // User Filter
        if (!empty($filter['user_id']) && $filter['user_id'] !== 'all') {
            $query->where('user_id', (int) $filter['user_id']);
        }

        // Date Range Filters
        if (!empty($filter['date_from'])) {
            $query->whereDate('created_at', '>=', $filter['date_from']);
        }
        if (!empty($filter['date_to'])) {
            $query->whereDate('created_at', '<=', $filter['date_to']);
        }

        // Sorting
        $sort = $filters['sort'] ?? '-created_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-');

        if (in_array($field, ['created_at', 'action', 'module', 'severity', 'user_name'], true)) {
            $query->orderBy($field, $direction);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query->paginate(max(5, min(100, $perPage)))->withQueryString();
    }

    public function getStats(): array
    {
        $today = Carbon::today();

        return [
            'total' => AuditLog::count(),
            'archived' => AuditLog::onlyTrashed()->count(),
            'undone' => AuditLog::where('is_undone', true)->count(),
            'today' => AuditLog::whereDate('created_at', $today)->count(),
            'critical' => AuditLog::whereIn('severity', ['warning', 'critical'])->count(),
            'auth' => AuditLog::where('module', 'Auth')->count(),
            'orders' => AuditLog::where('module', 'Orders')->count(),
            'staff' => AuditLog::where('module', 'Staff')->count(),
            'products' => AuditLog::where('module', 'Products')->count(),
            'customers' => AuditLog::where('module', 'Customers')->count(),
            'inventory' => AuditLog::where('module', 'Inventory')->count(),
            'printing' => AuditLog::where('module', 'Printing')->count(),
        ];
    }

    public function archiveLog(int $id): bool
    {
        $log = AuditLog::findOrFail($id);
        return (bool) $log->delete();
    }

    public function restoreLog(int $id): bool
    {
        $log = AuditLog::onlyTrashed()->findOrFail($id);
        return (bool) $log->restore();
    }

    public function bulkArchive(array $ids): int
    {
        return AuditLog::whereIn('id', $ids)->delete();
    }

    public function bulkRestore(array $ids): int
    {
        return AuditLog::onlyTrashed()->whereIn('id', $ids)->restore();
    }

    public function undoChange(int $id, User $actor): array
    {
        $log = AuditLog::withTrashed()->findOrFail($id);
        return $log->applyUndo($actor);
    }

    public function redoChange(int $id, User $actor): array
    {
        $log = AuditLog::withTrashed()->findOrFail($id);
        return $log->applyRedo($actor);
    }

    public function purgeOldLogs(int $days = 90): int
    {
        $cutoff = Carbon::now()->subDays($days);
        // Soft deletes / archives older logs without deleting rows from database
        return AuditLog::where('created_at', '<', $cutoff)->delete();
    }
}
