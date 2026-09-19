<?php

namespace App\Enums;

enum ProductViewerType: string
{
    case NONE = 'none';
    case MUG = 'mug';
    case PIN = 'pin';
    case SHIRT = 'shirt';
    case TOTE = 'tote';
    case STICKER = 'sticker';
    case CALENDAR = 'calendar';
    case GLB = 'glb';

    public static function default(): string
    {
        return self::NONE->value;
    }

    /** @return string[] */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
