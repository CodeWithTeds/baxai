<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class BulkUpdateOrderStatusRequest extends FormRequest
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
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer|distinct|exists:orders,id',
            'status' => 'required|string|in:in_progress,processing,delivered,cancelled',
            'courier_name' => 'required_if:status,processing,delivered|nullable|string|max:100',
            'tracking_number' => 'required_if:status,processing,delivered|nullable|string|max:100',
            'tracking_url' => 'nullable|url|max:500',
            'notes' => 'required_if:status,cancelled|nullable|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'ids.required' => 'At least one order must be selected for bulk update.',
            'courier_name.required_if' => 'The courier name is required when status is processing or delivered.',
            'tracking_number.required_if' => 'The tracking number is required when status is processing or delivered.',
            'notes.required_if' => 'A cancellation reason (notes) is required when cancelling orders in bulk.',
            'tracking_url.url' => 'The tracking URL must be a valid URL.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $ids = (array) $this->input('ids', []);
            $newStatus = $this->input('status');

            if (! empty($ids) && $newStatus) {
                $orders = Order::whereIn('id', $ids)->get(['id', 'order_number', 'status']);

                $terminalOrders = $orders->filter(function ($o) use ($newStatus) {
                    return in_array($o->status, ['delivered', 'cancelled'], true) && $o->status !== $newStatus;
                });

                if ($terminalOrders->isNotEmpty()) {
                    $offendingList = $terminalOrders
                        ->map(fn ($o) => "#{$o->order_number} ({$o->status})")
                        ->join(', ');

                    $validator->errors()->add('ids', "Cannot update terminal orders: {$offendingList}.");
                }
            }
        });
    }
}
