<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'customer_code',
    'email',
    'phone',
    'company',
    'status',
    'type',
    'avatar',
    'notes',
    'address',
    'city',
    'state',
    'postal_code',
    'country',
    'total_orders',
    'total_spent',
    'sort_order',
])]
class Customer extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $casts = [
        'total_orders' => 'integer',
        'total_spent' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeLead($query)
    {
        return $query->where('status', 'lead');
    }

    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
