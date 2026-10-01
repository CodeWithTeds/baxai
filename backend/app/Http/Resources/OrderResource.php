<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $firstItem = $this->items->first();
        $primaryProductName = $firstItem ? $firstItem->product_name : 'Custom Order';
        $primaryImage = $firstItem ? ($firstItem->banner_image ?: ($firstItem->customization['imageUri'] ?? null)) : null;

        return [
            'id' => (string) $this->id,
            'order_number' => $this->order_number,
            'orderNumber' => $this->order_number,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'customer_phone' => $this->customer_phone,
            'status' => $this->status,
            'placed_at' => $this->placed_at ? $this->placed_at->toIso8601String() : null,
            'placedOn' => $this->placed_at ? $this->placed_at->format('M d, Y') : null,
            'expected_delivery' => $this->expected_delivery ?: ($this->placed_at ? $this->placed_at->addDays(5)->format('M d') : 'Pending'),
            'expectedDelivery' => $this->expected_delivery ?: ($this->placed_at ? $this->placed_at->addDays(5)->format('M d') : 'Pending'),
            'productName' => $primaryProductName,
            'image' => $primaryImage,
            'subtotal' => (float) $this->subtotal,
            'subtotal_formatted' => '₱' . number_format((float) $this->subtotal, 2),
            'customization_total' => (float) $this->customization_total,
            'customization_total_formatted' => '₱' . number_format((float) $this->customization_total, 2),
            'shipping_fee' => (float) $this->shipping_fee,
            'shipping_fee_formatted' => $this->shipping_fee > 0 ? '₱' . number_format((float) $this->shipping_fee, 2) : 'Free',
            'delivery' => $this->shipping_fee > 0 ? '₱' . number_format((float) $this->shipping_fee, 2) : 'Free',
            'discount_total' => (float) $this->discount_total,
            'discount_total_formatted' => '₱' . number_format((float) $this->discount_total, 2),
            'total' => (float) $this->total,
            'total_formatted' => '₱' . number_format((float) $this->total, 2),
            'total_display' => '₱' . number_format((float) $this->total, 2),
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'tracking_steps' => $this->tracking_steps ?? \App\Models\Order::buildDefaultTrackingSteps($this->status, $this->placed_at ? $this->placed_at->format('M d, h:i A') : null),
            'trackingSteps' => $this->tracking_steps ?? \App\Models\Order::buildDefaultTrackingSteps($this->status, $this->placed_at ? $this->placed_at->format('M d, h:i A') : null),
            'shipping_address' => $this->shipping_address,
            'notes' => $this->notes,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'lineItems' => OrderItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->items ? $this->items->sum('quantity') : 0,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
        ];
    }
}
