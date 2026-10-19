<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    /**
     * In-memory cache of old values for models being updated.
     */
    protected static array $auditOldValuesMap = [];

    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            if (AuditLog::$disableAuditing) {
                return;
            }

            $modelName = class_basename($model);
            $module = self::getAuditModule($model);
            $name = $model->name ?? $model->title ?? $model->customer_code ?? "#{$model->id}";

            $cleanAttributes = self::filterAuditAttributes($model->getAttributes());

            $log = AuditLog::record(
                action: strtolower($modelName) . '.created',
                description: "Created {$modelName} \"{$name}\" (#{$model->id}).",
                module: $module,
                entity: $model,
                oldValues: null,
                newValues: $cleanAttributes,
                severity: 'info'
            );

            request()?->attributes->set('last_audit_log_id', $log->id);
            if (session()) {
                session()->flash('undo_audit_id', $log->id);
            }
        });

        static::updating(function (Model $model) {
            if (AuditLog::$disableAuditing) {
                return;
            }

            $dirty = $model->getDirty();
            $old = [];
            foreach (array_keys($dirty) as $key) {
                $old[$key] = $model->getOriginal($key);
            }
            self::$auditOldValuesMap[spl_object_id($model)] = self::filterAuditAttributes($old);
        });

        static::updated(function (Model $model) {
            if (AuditLog::$disableAuditing) {
                return;
            }

            $modelId = spl_object_id($model);
            $oldValues = self::$auditOldValuesMap[$modelId] ?? [];
            unset(self::$auditOldValuesMap[$modelId]);

            $newValues = self::filterAuditAttributes($model->getChanges());

            // Ignore timestamps
            unset($oldValues['updated_at'], $newValues['updated_at']);

            if (empty($oldValues) && empty($newValues)) {
                return;
            }

            $modelName = class_basename($model);
            $module = self::getAuditModule($model);
            $name = $model->name ?? $model->title ?? $model->customer_code ?? "#{$model->id}";

            $changedFields = implode(', ', array_keys($newValues));
            $description = "Updated {$modelName} \"{$name}\" (#{$model->id}): modified {$changedFields}.";

            $log = AuditLog::record(
                action: strtolower($modelName) . '.updated',
                description: $description,
                module: $module,
                entity: $model,
                oldValues: $oldValues,
                newValues: $newValues,
                severity: 'info'
            );

            request()?->attributes->set('last_audit_log_id', $log->id);
            if (session()) {
                session()->flash('undo_audit_id', $log->id);
            }
        });

        static::deleted(function (Model $model) {
            if (AuditLog::$disableAuditing) {
                return;
            }

            $modelName = class_basename($model);
            $module = self::getAuditModule($model);
            $name = $model->name ?? $model->title ?? $model->customer_code ?? "#{$model->id}";

            $isSoftDelete = method_exists($model, 'isForceDeleting') ? !$model->isForceDeleting() : true;
            $action = $isSoftDelete ? strtolower($modelName) . '.archived' : strtolower($modelName) . '.deleted';
            $desc = $isSoftDelete
                ? "Archived {$modelName} \"{$name}\" (#{$model->id})."
                : "Deleted {$modelName} \"{$name}\" (#{$model->id}).";

            $log = AuditLog::record(
                action: $action,
                description: $desc,
                module: $module,
                entity: $model,
                oldValues: ['status' => $model->status ?? 'active'],
                newValues: ['status' => 'archived'],
                severity: 'warning'
            );

            request()?->attributes->set('last_audit_log_id', $log->id);
            if (session()) {
                session()->flash('undo_audit_id', $log->id);
            }
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(function (Model $model) {
                if (AuditLog::$disableAuditing) {
                    return;
                }

                $modelName = class_basename($model);
                $module = self::getAuditModule($model);
                $name = $model->name ?? $model->title ?? $model->customer_code ?? "#{$model->id}";

                $log = AuditLog::record(
                    action: strtolower($modelName) . '.restored',
                    description: "Restored {$modelName} \"{$name}\" (#{$model->id}) from archive.",
                    module: $module,
                    entity: $model,
                    oldValues: ['status' => 'archived'],
                    newValues: ['status' => $model->status ?? 'active'],
                    severity: 'success'
                );

                request()?->attributes->set('last_audit_log_id', $log->id);
                if (session()) {
                    session()->flash('undo_audit_id', $log->id);
                }
            });
        }
    }

    protected static function getAuditModule(Model $model): string
    {
        return match (class_basename($model)) {
            'Customer' => 'Customers',
            'User', 'StaffProfile' => 'Staff',
            'Order' => 'Orders',
            'Product' => 'Products',
            'PrintItem', 'PrintCategory' => 'Inventory',
            'PrintOrder', 'PrintService' => 'Printing',
            'Discount' => 'Discounts',
            'Reward' => 'Rewards',
            default => 'System',
        };
    }

    protected static function filterAuditAttributes(array $attributes): array
    {
        $sensitive = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes', 'updated_at'];
        foreach ($sensitive as $s) {
            unset($attributes[$s]);
        }
        return $attributes;
    }
}
