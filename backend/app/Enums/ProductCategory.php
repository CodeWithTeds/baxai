<?php

namespace App\Enums;

enum ProductCategory: string
{
    case MUGS = 'mugs';
    case PINS = 'pins';
    case STICKERS = 'stickers';
    case TSHIRTS = 'tshirts';
    case TOTE_BAGS = 'tote_bags';
    case CALENDARS = 'calendars';
    case PRINTING = 'printing';
    case OTHERS = 'others';

    /** @return string[] */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
