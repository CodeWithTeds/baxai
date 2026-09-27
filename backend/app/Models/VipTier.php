<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'name',
    'min_spend',
    'points_multiplier',
    'discount_percentage',
    'perks',
    'color',
    'sort_order',
])]
class VipTier extends Model
{
    use HasFactory;

    protected $casts = [
        'min_spend' => 'decimal:2',
        'points_multiplier' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'sort_order' => 'integer',
    ];
}
