<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        if (AuditLog::count() > 0) {
            return;
        }

        $admin = User::where('role', 'admin')->first() ?? User::first();

        $sampleLogs = [
            [
                'action' => 'auth.login.success',
                'module' => 'Auth',
                'description' => 'Administrator successfully authenticated via standard email session.',
                'entity_type' => User::class,
                'entity_id' => $admin?->id ?? 1,
                'old_values' => null,
                'new_values' => ['ip' => '127.0.0.1', 'auth_provider' => 'session'],
                'severity' => 'info',
                'created_at' => Carbon::now()->subMinutes(12),
            ],
            [
                'action' => 'staff.created',
                'module' => 'Staff',
                'description' => 'Created new employee account for prepress lead prepress01@nuyda.ph.',
                'entity_type' => User::class,
                'entity_id' => 17,
                'old_values' => null,
                'new_values' => ['name' => 'Prepress Lead', 'role' => 'staff', 'department' => 'Prepress & Graphics'],
                'severity' => 'info',
                'created_at' => Carbon::now()->subHours(2),
            ],
            [
                'action' => 'customer.tier_upgraded',
                'module' => 'Customers',
                'description' => 'Upgraded customer CUST-00234 account status to VIP tier.',
                'entity_type' => 'App\Models\Customer',
                'entity_id' => 234,
                'old_values' => ['type' => 'individual', 'credit_limit' => 5000],
                'new_values' => ['type' => 'vip', 'credit_limit' => 25000],
                'severity' => 'success',
                'created_at' => Carbon::now()->subHours(4),
            ],
            [
                'action' => 'order.status_updated',
                'module' => 'Orders',
                'description' => 'Order #ORD-2026-881 transitioned from Processing to Out for Delivery.',
                'entity_type' => 'App\Models\Order',
                'entity_id' => 881,
                'old_values' => ['status' => 'processing', 'fulfillment_stage' => 'packed'],
                'new_values' => ['status' => 'dispatched', 'fulfillment_stage' => 'in_transit', 'courier' => 'Lalamove PH'],
                'severity' => 'info',
                'created_at' => Carbon::now()->subHours(7),
            ],
            [
                'action' => 'inventory.low_stock_warning',
                'module' => 'Inventory',
                'description' => 'Sublimation Ink Black (500ml) dropped below critical replenishment threshold (4 units remaining).',
                'entity_type' => 'App\Models\PrintItem',
                'entity_id' => 45,
                'old_values' => ['stock_qty' => 12],
                'new_values' => ['stock_qty' => 4, 'reorder_point' => 10],
                'severity' => 'warning',
                'created_at' => Carbon::now()->subHours(18),
            ],
            [
                'action' => 'auth.failed_attempt',
                'module' => 'Auth',
                'description' => 'Multiple failed login attempts detected for account unknown_user@nuyda.com.',
                'entity_type' => null,
                'entity_id' => null,
                'old_values' => null,
                'new_values' => ['attempt_count' => 3, 'ip' => '192.168.1.105'],
                'severity' => 'warning',
                'created_at' => Carbon::now()->subDay(),
            ],
            [
                'action' => 'system.backup_completed',
                'module' => 'System',
                'description' => 'Automated nightly database and assets backup completed (Size: 142.8 MB).',
                'entity_type' => null,
                'entity_id' => null,
                'old_values' => null,
                'new_values' => ['backup_archive' => 'placides_db_20261018.sql.gz', 'duration_ms' => 4210],
                'severity' => 'info',
                'created_at' => Carbon::now()->subDays(2),
            ],
            [
                'action' => 'security.permission_escalation_blocked',
                'module' => 'Staff',
                'description' => 'Blocked unauthorized role update attempt from staff session to administrator privileges.',
                'entity_type' => User::class,
                'entity_id' => 11,
                'old_values' => ['role' => 'staff'],
                'new_values' => ['attempted_role' => 'admin', 'denied' => true],
                'severity' => 'critical',
                'created_at' => Carbon::now()->subDays(3),
            ],
        ];

        foreach ($sampleLogs as $data) {
            AuditLog::create([
                'user_id' => $admin?->id,
                'user_name' => $admin?->name ?? 'System Administrator',
                'user_email' => $admin?->email ?? 'admin@nuyda.local',
                'user_role' => $admin?->role ?? 'admin',
                'action' => $data['action'],
                'module' => $data['module'],
                'description' => $data['description'],
                'entity_type' => $data['entity_type'],
                'entity_id' => $data['entity_id'],
                'old_values' => $data['old_values'],
                'new_values' => $data['new_values'],
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'severity' => $data['severity'],
                'created_at' => $data['created_at'],
                'updated_at' => $data['created_at'],
            ]);
        }
    }
}
