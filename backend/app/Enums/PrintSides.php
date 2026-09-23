<?php

namespace App\Enums;

enum PrintSides: string
{
    case SINGLE_SIDED = 'single_sided';
    case DOUBLE_SIDED = 'double_sided';
    case VARIABLE = 'variable';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::SINGLE_SIDED => 'Single-Sided (1S)',
            self::DOUBLE_SIDED => 'Double-Sided (2S)',
            self::VARIABLE => 'Variable / Custom',
        };
    }
}
