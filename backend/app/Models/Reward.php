<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'title',
    'code',
    'description',
    'points_required',
    'reward_type',
    'discount_value',
    'status',
    'claims_count',
    'sort_order',
])]
class Reward extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $casts = [
        'points_required' => 'integer',
        'discount_value' => 'decimal:2',
        'claims_count' => 'integer',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function customerRewards()
    {
        return $table = $this->hasMany(CustomerReward::class);
    }
}
