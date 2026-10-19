<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditLog extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Prevents recursive auditing during undo and redo operations.
     */
    public static bool $disableAuditing = false;

    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'user_role',
        'action',
        'module',
        'description',
        'entity_type',
        'entity_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'severity',
        'is_undone',
        'undone_at',
        'undone_by_id',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'is_undone' => 'boolean',
        'undone_at' => 'datetime',
        'deleted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'can_undo',
        'can_redo',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function undoneBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'undone_by_id');
    }

    /**
     * Determine if this audit log's entity state change can be undone.
     */
    public function getCanUndoAttribute(): bool
    {
        if ($this->is_undone) {
            return false;
        }

        if (empty($this->entity_type) || empty($this->entity_id)) {
            return false;
        }

        return !empty($this->old_values)
            || str_contains($this->action, 'deleted')
            || str_contains($this->action, 'archived')
            || str_contains($this->action, 'created');
    }

    /**
     * Determine if this audit log's undone change can be redone.
     */
    public function getCanRedoAttribute(): bool
    {
        if (!$this->is_undone) {
            return false;
        }

        if (empty($this->entity_type) || empty($this->entity_id)) {
            return false;
        }

        return !empty($this->new_values)
            || str_contains($this->action, 'deleted')
            || str_contains($this->action, 'archived')
            || str_contains($this->action, 'created');
    }

    /**
     * Apply undo (revert to old state / restore archived entity / delete created entity).
     */
    public function applyUndo(User $actor): array
    {
        if (!$this->can_undo) {
            return ['success' => false, 'message' => 'This audit action cannot be undone.'];
        }

        $entityClass = $this->entity_type;
        if (!class_exists($entityClass)) {
            return ['success' => false, 'message' => "Entity class {$entityClass} no longer exists."];
        }

        self::$disableAuditing = true;

        try {
            $query = method_exists($entityClass, 'withTrashed') ? $entityClass::withTrashed() : $entityClass::query();
            $entity = $query->find($this->entity_id);

            if (!$entity) {
                return ['success' => false, 'message' => "Target record (#{$this->entity_id}) not found."];
            }

            // If action was created -> undoing it archives / soft-deletes the created entity
            if (str_contains($this->action, 'created')) {
                if (method_exists($entity, 'delete')) {
                    $entity->delete();
                }
            }
            // If action was an archival / deletion -> undoing it restores the entity
            elseif ((str_contains($this->action, 'deleted') || str_contains($this->action, 'archived')) && method_exists($entity, 'restore')) {
                $entity->restore();
                if (isset($entity->status) && $entity->status === 'archived') {
                    $entity->status = 'active';
                    $entity->save();
                }
            }
            // If action was an update -> revert modified attributes to old_values
            elseif (!empty($this->old_values)) {
                $guarded = ['id', 'created_at', 'updated_at', 'deleted_at'];
                foreach ($this->old_values as $key => $val) {
                    if (!in_array($key, $guarded, true)) {
                        $entity->{$key} = $val;
                    }
                }
                $entity->save();
            }

            $this->update([
                'is_undone' => true,
                'undone_at' => now(),
                'undone_by_id' => $actor->id,
            ]);

            self::record(
                action: 'audit.undo',
                description: "Undid action [{$this->action}] on " . class_basename($this->entity_type) . " #{$this->entity_id}.",
                module: $this->module,
                entity: $entity,
                oldValues: $this->new_values,
                newValues: $this->old_values,
                severity: 'warning',
                actor: $actor
            );

            return ['success' => true, 'message' => "Successfully reverted {$this->action} on " . class_basename($this->entity_type) . " #{$this->entity_id}."];
        } finally {
            self::$disableAuditing = false;
        }
    }

    /**
     * Apply redo (re-apply new state / re-archive entity / restore created entity).
     */
    public function applyRedo(User $actor): array
    {
        if (!$this->can_redo) {
            return ['success' => false, 'message' => 'This audit action cannot be redone.'];
        }

        $entityClass = $this->entity_type;
        if (!class_exists($entityClass)) {
            return ['success' => false, 'message' => "Entity class {$entityClass} no longer exists."];
        }

        self::$disableAuditing = true;

        try {
            $query = method_exists($entityClass, 'withTrashed') ? $entityClass::withTrashed() : $entityClass::query();
            $entity = $query->find($this->entity_id);

            if (!$entity) {
                return ['success' => false, 'message' => "Target record (#{$this->entity_id}) not found."];
            }

            // If action was created -> redoing it restores the entity
            if (str_contains($this->action, 'created')) {
                if (method_exists($entity, 'restore')) {
                    $entity->restore();
                }
            }
            // If action was an archival / deletion -> redoing it re-deletes/re-archives
            elseif ((str_contains($this->action, 'deleted') || str_contains($this->action, 'archived')) && method_exists($entity, 'delete')) {
                if (isset($entity->status)) {
                    $entity->status = 'archived';
                    $entity->save();
                }
                $entity->delete();
            }
            // If action was an update -> reapply new_values
            elseif (!empty($this->new_values)) {
                $guarded = ['id', 'created_at', 'updated_at', 'deleted_at'];
                foreach ($this->new_values as $key => $val) {
                    if (!in_array($key, $guarded, true)) {
                        $entity->{$key} = $val;
                    }
                }
                $entity->save();
            }

            $this->update([
                'is_undone' => false,
                'undone_at' => null,
                'undone_by_id' => null,
            ]);

            self::record(
                action: 'audit.redo',
                description: "Redid action [{$this->action}] on " . class_basename($this->entity_type) . " #{$this->entity_id}.",
                module: $this->module,
                entity: $entity,
                oldValues: $this->old_values,
                newValues: $this->new_values,
                severity: 'info',
                actor: $actor
            );

            return ['success' => true, 'message' => "Successfully reapplied {$this->action} on " . class_basename($this->entity_type) . " #{$this->entity_id}."];
        } finally {
            self::$disableAuditing = false;
        }
    }

    /**
     * Record an audit event into the database.
     */
    public static function record(
        string $action,
        string $description,
        string $module = 'System',
        ?Model $entity = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        string $severity = 'info',
        ?User $actor = null
    ): self {
        $actor = $actor ?? auth()->user();
        $request = request();

        return self::create([
            'user_id' => $actor?->id,
            'user_name' => $actor?->name ?? 'System',
            'user_email' => $actor?->email,
            'user_role' => $actor?->role ?? 'system',
            'action' => $action,
            'module' => $module,
            'description' => $description,
            'entity_type' => $entity ? get_class($entity) : null,
            'entity_id' => $entity?->getKey(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
            'severity' => in_array($severity, ['info', 'success', 'warning', 'critical'], true) ? $severity : 'info',
        ]);
    }
}
