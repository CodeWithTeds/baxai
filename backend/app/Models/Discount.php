<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'code',
    'name',
    'description',
    'type',
    'value',
    'min_order_amount',
    'max_discount_amount',
    'applicable_category',
    'usage_limit',
    'used_count',
    'start_date',
    'end_date',
    'status',
    'sort_order',
])]
class Discount extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
        'sort_order' => 'integer',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
