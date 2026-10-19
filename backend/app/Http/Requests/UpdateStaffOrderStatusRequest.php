<?php

namespace App\Http\Requests;

use App\Enums\StaffFulfillmentStatusEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                Rule::in(array_column(StaffFulfillmentStatusEnum::cases(), 'value')),
            ],
        ];
    }
}
