<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Repositories\AuditLogRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public const MODULES = [
        'Auth',
        'Staff',
        'Orders',
        'Inventory',
        'Products',
        'Customers',
        'Printing',
        'Discounts',
        'Rewards',
        'System',
    ];

    public const SEVERITIES = [
        'info',
        'success',
        'warning',
        'critical',
    ];

    public function __construct(
        protected AuditLogRepositoryInterface $auditLogs
    ) {}

    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, ['admin', 'superadmin', 'manager'], true)) {
            if ($request->header('X-Inertia')) {
                abort(403, 'Unauthorized access to audit logs.');
            }

            return redirect()->route('staff.portal')->with('error', 'Unauthorized access to audit logs.');
        }

        return Inertia::render('audit-logs/index', [
            'logs' => $this->auditLogs->paginated(
                $request->only('filter', 'sort'),
                (int) $request->get('per_page', 25)
            ),
            'filters' => (object) $request->only('filter', 'sort', 'per_page'),
            'stats' => $this->auditLogs->getStats(),
            'modules' => self::MODULES,
            'severities' => self::SEVERITIES,
        ]);
    }

    public function archive(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can archive audit logs.');

        $this->auditLogs->archiveLog($id);

        return back()->with('success', "Audit log #{$id} archived.");
    }

    public function restore(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can restore audit logs.');

        $this->auditLogs->restoreLog($id);

        return back()->with('success', "Audit log #{$id} restored.");
    }

    public function bulkArchive(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can archive audit logs.');

        $ids = (array) $request->input('ids', []);
        $count = $this->auditLogs->bulkArchive($ids);

        return back()->with('success', "Archived {$count} audit log(s).");
    }

    public function bulkRestore(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can restore audit logs.');

        $ids = (array) $request->input('ids', []);
        $count = $this->auditLogs->bulkRestore($ids);

        return back()->with('success', "Restored {$count} audit log(s).");
    }

    public function undo(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can undo audit log changes.');

        $res = $this->auditLogs->undoChange($id, $user);

        if (!$res['success']) {
            return back()->with('error', $res['message']);
        }

        return back()->with('success', $res['message']);
    }

    public function redo(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can redo audit log changes.');

        $res = $this->auditLogs->redoChange($id, $user);

        if (!$res['success']) {
            return back()->with('error', $res['message']);
        }

        return back()->with('success', $res['message']);
    }

    public function purge(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if(!$user || !in_array($user->role, ['admin', 'superadmin'], true), 403, 'Only administrators can purge audit logs.');

        $days = (int) $request->input('days', 90);
        $days = max(7, min(365, $days));

        // Soft deletes / archives older records, no actual delete of data
        $count = $this->auditLogs->purgeOldLogs($days);

        AuditLog::record(
            action: 'audit.archived_purge',
            description: "Archived {$count} historical audit log records older than {$days} days.",
            module: 'System',
            severity: 'warning',
            actor: $user
        );

        return redirect()->route('audit-logs.index')->with('success', "Archived {$count} historical audit log(s). Data safely retained in archive.");
    }
}
