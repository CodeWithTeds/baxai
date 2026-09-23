<?php

namespace App\Http\Requests;

use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255', 'regex:/^[\pL\s\-\'.]+$/u'],
            'customer_code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-]+$/', 'unique:customers,customer_code'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:customers,email'],
            'phone' => ['nullable', 'string', 'digits:11', 'regex:/^09\d{9}$/'],
            'company' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(CustomerStatus::values())],
            'type' => ['required', 'string', Rule::in(CustomerType::values())],
            'avatar' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20', 'regex:/^[0-9A-Za-z\s\-]+$/'],
            'country' => ['nullable', 'string', 'max:100'],
            'total_orders' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'total_spent' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Customer name is required.',
            'name.min' => 'Customer name must be at least 2 characters.',
            'name.regex' => 'Customer name can only contain letters, spaces, hyphens, and dots.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'This email address is already registered to another customer.',
            'phone.digits' => 'The phone number must be exactly 11 numeric digits.',
            'phone.regex' => 'The phone number must be a valid Philippine mobile number starting with 09 (e.g. 09171234567).',
            'customer_code.regex' => 'Customer code can only contain letters, numbers, and hyphens.',
            'customer_code.unique' => 'This customer code is already in use.',
            'postal_code.regex' => 'Postal code contains invalid characters.',
        ];
    }
}
