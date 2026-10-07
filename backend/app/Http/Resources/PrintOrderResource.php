<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrintOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'order_number' => $this->order_number,
            'orderNumber' => $this->order_number,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer?->name,
            'customer_email' => $this->customer?->email,
            'service_id' => $this->service_id,
            'service_name' => $this->service_name,
            'specifications' => $this->specifications ?? [],
            'file_url' => $this->file_url ? asset('storage/'.$this->file_url) : null,
            'file_name' => $this->file_name,
            'file_size' => $this->file_size,
            'file_type' => $this->file_type,
            'quantity' => $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'unit_price_formatted' => '₱'.number_format((float) $this->unit_price, 2),
            'subtotal' => (float) $this->subtotal,
            'subtotal_formatted' => '₱'.number_format((float) $this->subtotal, 2),
            'rush_fee' => (float) $this->rush_fee,
            'rush_fee_formatted' => '₱'.number_format((float) $this->rush_fee, 2),
            'shipping_fee' => (float) $this->shipping_fee,
            'shipping_fee_formatted' => $this->shipping_fee > 0 ? '₱'.number_format((float) $this->shipping_fee, 2) : 'Free',
            'total' => (float) $this->total,
            'total_formatted' => '₱'.number_format((float) $this->total, 2),
            'fulfillment_type' => $this->fulfillment_type,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'gcash_reference_number' => $this->gcash_reference_number,
            'gcash_screenshot_url' => $this->gcash_screenshot_url ? asset('storage/'.$this->gcash_screenshot_url) : null,
            'courier_name' => $this->courier_name,
            'tracking_number' => $this->tracking_number,
            'tracking_url' => $this->tracking_url,
            'notes' => $this->notes,
            'admin_notes' => $this->admin_notes,
            'placed_at' => $this->placed_at?->toIso8601String(),
            'placedOn' => $this->placed_at?->format('M d, Y'),
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,
            'can_cancel' => $this->isCancellable(),
            'canCancel' => $this->isCancellable(),
            'is_pickup' => $this->isPickup(),
            'isPaid' => $this->isPaid(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
