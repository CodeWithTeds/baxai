<?php

namespace App\Enums;

enum ProductViewerType: string
{
    case NONE = 'none';
    case MUG = 'mug';
    case GLASS_CUP = 'glass_cup';
    case TUMBLER = 'tumbler';
    case TRAVEL_MUG = 'travel_mug';
    case COFFEE_CUP = 'coffee_cup';
    case TEACUP = 'teacup';
    case ESPRESSO = 'espresso';
    case LATTE = 'latte';
    case CAPPUCCINO = 'cappuccino';
    case STEIN = 'stein';
    case TANKARD = 'tankard';
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
