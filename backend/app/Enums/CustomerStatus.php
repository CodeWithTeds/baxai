<?php

namespace App\Enums;

enum CustomerStatus: string
{
    case DRAFT = 'draft';
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case LEAD = 'lead';
    case ARCHIVED = 'archived';

    public static function default(): string
    {
        return self::ACTIVE->value;
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
