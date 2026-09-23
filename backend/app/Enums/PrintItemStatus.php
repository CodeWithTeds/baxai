<?php

namespace App\Enums;

enum PrintItemStatus: string
{
    case ACTIVE = 'active';
    case DRAFT = 'draft';
    case INACTIVE = 'inactive';
    case ARCHIVED = 'archived';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE => 'Active',
            self::DRAFT => 'Draft',
            self::INACTIVE => 'Inactive',
            self::ARCHIVED => 'Archived',
        };
    }
}
