<?php

namespace App\Enums;

enum StaffFulfillmentStatusEnum: string
{
    case IN_PROGRESS = 'in_progress';
    case PROCESSING = 'processing';
    case DELIVERED = 'delivered';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::IN_PROGRESS => 'In Progress',
            self::PROCESSING => 'Processing / Packing',
            self::DELIVERED => 'Delivered / Dispatched',
            self::CANCELLED => 'Cancelled',
        };
    }
}
