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
    case SHIRT_REGULAR = 'shirt_regular';
    case SHIRT_OVERSIZED = 'shirt_oversized';
    case SHIRT_BOXY = 'shirt_boxy';
    case SHIRT_RELAXED = 'shirt_relaxed';
    case SHIRT_SLIM = 'shirt_slim';
    case SHIRT_CROPPED = 'shirt_cropped';
    case SHIRT_BABY = 'shirt_baby';
    case SHIRT_LONGLINE = 'shirt_longline';
    case SHIRT_HEAVY = 'shirt_heavy';
    case SHIRT_RINGER = 'shirt_ringer';
    case SHIRT_POCKET = 'shirt_pocket';
    case SHIRT_GRAPHIC = 'shirt_graphic';
    case SHIRT_CREW = 'shirt_crew';
    case SHIRT_VNECK = 'shirt_vneck';
    case SHIRT_SCOOP = 'shirt_scoop';
    case SHIRT_HENLEY = 'shirt_henley';
    case TOTE = 'tote';
    case MINI_TOTE = 'mini_tote';
    case SHOULDER_BAG = 'shoulder_bag';
    case CROSSBODY = 'crossbody';
    case DRAWSTRING = 'drawstring';
    case CANVAS_BAG = 'canvas_bag';
    case ZIP_TOTE = 'zip_tote';
    case GUSSETED_TOTE = 'gusseted_tote';
    case FLAT_TOTE = 'flat_tote';
    case BOOK_TOTE = 'book_tote';
    case GROCERY_TOTE = 'grocery_tote';
    case CLEAR_TOTE = 'clear_tote';
    case BEACH_TOTE = 'beach_tote';
    case LAPTOP_TOTE = 'laptop_tote';
    case LEATHER_TOTE = 'leather_tote';
    case CONVERTIBLE_TOTE = 'convertible_tote';
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
