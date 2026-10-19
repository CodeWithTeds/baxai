<?php

namespace App\Repositories;

use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class StaffRepository extends BaseRepository implements StaffRepositoryInterface
{
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    public function paginated(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        return QueryBuilder::for(User::query()->with('staffProfile'))
            ->allowedFilters(
                'name',
                'username',
                'email',
                'role',
                AllowedFilter::exact('is_active'),
                AllowedFilter::callback('department', function ($query, $value): void {
                    $query->whereHas('staffProfile', function ($q) use ($value): void {
                        $q->where('department', $value);
                    });
                }),
                AllowedFilter::callback('shift', function ($query, $value): void {
                    $query->whereHas('staffProfile', function ($q) use ($value): void {
                        $q->where('shift', $value);
                    });
                }),
                AllowedFilter::callback('search', function ($query, $value): void {
                    $query->where(function ($q) use ($value): void {
                        $term = "%{$value}%";
                        $q->where('name', 'like', $term)
                            ->orWhere('username', 'like', $term)
                            ->orWhere('email', 'like', $term)
                            ->orWhere('role', 'like', $term)
                            ->orWhereHas('staffProfile', function ($sq) use ($term): void {
                                $sq->where('employee_id', 'like', $term)
                                    ->orWhere('department', 'like', $term)
                                    ->orWhere('position', 'like', $term)
                                    ->orWhere('workstation', 'like', $term)
                                    ->orWhere('phone', 'like', $term);
                            });
                    });
                }),
            )
            ->allowedSorts('id', 'name', 'username', 'email', 'role', 'is_active', 'created_at')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends(request()->query());
    }

    public function findWithProfile(mixed $id): User
    {
        /** @var User */
        return User::query()->with('staffProfile')->findOrFail($id);
    }

    public function createStaff(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $employeeId = ! empty($data['employee_id'])
                ? trim($data['employee_id'])
                : $this->generateNextEmployeeId();

            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => $data['role'] ?? 'staff',
                'is_active' => $data['is_active'] ?? true,
                'email_verified_at' => now(),
            ]);

            $user->staffProfile()->create([
                'employee_id' => $employeeId,
                'department' => $data['department'] ?? 'General',
                'position' => $data['position'] ?? 'Staff',
                'workstation' => $data['workstation'] ?? null,
                'shift' => $data['shift'] ?? 'Regular',
                'phone' => $data['phone'] ?? null,
                'emergency_contact' => $data['emergency_contact'] ?? null,
                'hire_date' => $data['hire_date'] ?? now()->toDateString(),
                'is_active' => $data['is_active'] ?? true,
                'notes' => $data['notes'] ?? null,
            ]);

            return $user->load('staffProfile');
        });
    }

    public function updateStaff(User $user, array $data): bool
    {
        return DB::transaction(function () use ($user, $data) {
            $userData = [
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'],
                'role' => $data['role'] ?? $user->role,
                'is_active' => $data['is_active'] ?? $user->is_active,
            ];

            if (! empty($data['password'])) {
                $userData['password'] = $data['password'];
            }

            $user->update($userData);

            $profileData = [
                'department' => $data['department'] ?? 'General',
                'position' => $data['position'] ?? 'Staff',
                'workstation' => $data['workstation'] ?? null,
                'shift' => $data['shift'] ?? null,
                'phone' => $data['phone'] ?? null,
                'emergency_contact' => $data['emergency_contact'] ?? null,
                'hire_date' => $data['hire_date'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'notes' => $data['notes'] ?? null,
            ];

            if (! empty($data['employee_id'])) {
                $profileData['employee_id'] = trim($data['employee_id']);
            }

            if ($user->staffProfile) {
                $user->staffProfile->update($profileData);
            } else {
                if (empty($profileData['employee_id'])) {
                    $profileData['employee_id'] = $this->generateNextEmployeeId();
                }
                $user->staffProfile()->create($profileData);
            }

            return true;
        });
    }

    public function deleteStaff(User $user): bool
    {
        return DB::transaction(function () use ($user) {
            if ($user->staffProfile) {
                $user->staffProfile->delete();
            }

            return $user->delete();
        });
    }

    public function toggleStatus(User $user): bool
    {
        return DB::transaction(function () use ($user) {
            $newStatus = ! $user->is_active;
            $user->update(['is_active' => $newStatus]);

            if ($user->staffProfile) {
                $user->staffProfile->update(['is_active' => $newStatus]);
            }

            return true;
        });
    }

    public function bulkUpdateStatus(array $ids, bool $isActive): int
    {
        return DB::transaction(function () use ($ids, $isActive) {
            User::whereIn('id', $ids)->update(['is_active' => $isActive]);
            StaffProfile::whereIn('user_id', $ids)->update(['is_active' => $isActive]);

            return count($ids);
        });
    }

    public function bulkDelete(array $ids): int
    {
        return DB::transaction(function () use ($ids) {
            $count = 0;
            // Prevent deleting current authenticated user if in array
            $currentUserId = auth()->id();
            $safeIds = array_diff($ids, [$currentUserId]);

            StaffProfile::whereIn('user_id', $safeIds)->delete();
            $count = User::whereIn('id', $safeIds)->delete();

            return $count;
        });
    }

    public function getStats(): array
    {
        return [
            'total' => User::count(),
            'active' => User::where('is_active', true)->count(),
            'inactive' => User::where('is_active', false)->count(),
            'operators' => User::where('role', 'operator')->count(),
            'prepress' => User::where('role', 'prepress_designer')->count(),
            'qc' => User::where('role', 'qc_lead')->count(),
            'managers' => User::whereIn('role', ['admin', 'manager', 'superadmin'])->count(),
        ];
    }

    public function generateNextEmployeeId(): string
    {
        $year = date('Y');
        $prefix = "STF-{$year}-";

        $latestProfile = StaffProfile::where('employee_id', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->first();

        if ($latestProfile && preg_match('/-(\d+)$/', $latestProfile->employee_id, $matches)) {
            $nextSeq = (int) $matches[1] + 1;
        } else {
            $nextSeq = StaffProfile::count() + 1;
        }

        return sprintf('%s%03d', $prefix, $nextSeq);
    }
}
