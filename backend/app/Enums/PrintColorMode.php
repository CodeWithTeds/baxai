<?php

namespace App\Enums;

enum PrintColorMode: string
{
    case FULL_COLOR = 'full_color';
    case MONOCHROME = 'monochrome';
    case GRAYSCALE = 'grayscale';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::FULL_COLOR => 'Full Color (CMYK)',
            self::MONOCHROME => 'Monochrome / Black & White',
            self::GRAYSCALE => 'Grayscale',
        };
    }
}
