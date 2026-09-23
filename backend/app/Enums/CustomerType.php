<?php

namespace App\Enums;

enum CustomerType: string
{
    case INDIVIDUAL = 'individual';
    case BUSINESS = 'business';
    case VIP = 'vip';
    case WHOLESALE = 'wholesale';

    public static function default(): string
    {
        return self::INDIVIDUAL->value;
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
