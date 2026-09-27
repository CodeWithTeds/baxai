<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'customer_id',
    'reward_id',
    'reward_code',
    'points_spent',
    'status',
    'issued_at',
    'redeemed_at',
])]
class CustomerReward extends Model
{
    use HasFactory;

    protected $casts = [
        'points_spent' => 'integer',
        'issued_at' => 'datetime',
        'redeemed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function reward()
    {
        return $this->belongsTo(Reward::class);
    }
}
