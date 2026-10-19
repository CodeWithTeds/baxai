<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // User credentials
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:users,username'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'role' => ['required', 'string', 'in:admin,manager,staff,operator,prepress_designer,qc_lead'],
            'is_active' => ['boolean'],

            // Staff Profile
            'employee_id' => ['nullable', 'string', 'max:50', 'unique:staff_profiles,employee_id'],
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
