<?php

namespace App\Http\Requests;

use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $staffParam = $this->route('staff');
        $userId = $staffParam instanceof User ? $staffParam->id : $staffParam;
        $profileId = $staffParam instanceof User
            ? $staffParam->staffProfile?->id
            : StaffProfile::where('user_id', $userId)->value('id');

        return [
            // User credentials
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['nullable', 'string', 'confirmed', Password::defaults()],
            'role' => ['required', 'string', 'in:admin,manager,staff,operator,prepress_designer,qc_lead'],
            'is_active' => ['boolean'],

            // Staff Profile
            'employee_id' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('staff_profiles', 'employee_id')->ignore($profileId),
            ],
            'department' => ['required', 'string', 'max:100'],
            'position' => ['required', 'string', 'max:100'],
            'workstation' => ['nullable', 'string', 'max:100'],
            'shift' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact' => ['nullable', 'string', 'max:100'],
            'hire_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
