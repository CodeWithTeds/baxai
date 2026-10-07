<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('courier_name') && is_string($this->courier_name)) {
            $merge['courier_name'] = trim($this->courier_name);
        }
        if ($this->has('tracking_number') && is_string($this->tracking_number)) {
            $merge['tracking_number'] = trim($this->tracking_number);
        }
        if ($this->has('tracking_url') && is_string($this->tracking_url)) {
            $trimmedUrl = trim($this->tracking_url);
            $merge['tracking_url'] = $trimmedUrl !== '' ? $trimmedUrl : null;
        }
        if ($this->has('notes') && is_string($this->notes)) {
            $merge['notes'] = trim($this->notes);
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'status' => 'required|string|in:in_progress,processing,delivered,cancelled',
            'courier_name' => 'required_if:status,processing,delivered|nullable|string|max:100',
            'tracking_number' => 'required_if:status,processing,delivered|nullable|string|max:100',
            'tracking_url' => 'nullable|url|max:500',
            'payment_status' => 'nullable|string|in:pending,paid,failed,refunded',
            'notes' => 'required_if:status,cancelled|nullable|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'courier_name.required_if' => 'The courier name is required when status is processing or delivered.',
            'tracking_number.required_if' => 'The tracking number is required when status is processing or delivered.',
            'notes.required_if' => 'A cancellation reason (notes) is required when cancelling an order.',
            'tracking_url.url' => 'The tracking URL must be a valid URL.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $routeOrder = $this->route('order');
            $order = $routeOrder instanceof Order ? $routeOrder : ($routeOrder ? Order::find($routeOrder) : null);

            if ($order) {
                $currentStatus = $order->status;
                $newStatus = $this->input('status');

                if (in_array($currentStatus, ['delivered', 'cancelled'], true) && $newStatus !== $currentStatus) {
                    if ($currentStatus === 'delivered' && $newStatus === 'cancelled') {
                        $validator->errors()->add('status', 'Delivered orders cannot be cancelled.');
                    } else {
                        $validator->errors()->add('status', 'Terminal orders cannot change status.');
                    }
                }
            }
        });
    }
}
