<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PrintService extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'status',
        'base_price',
        'unit',
        'min_quantity',
        'max_file_size_mb',
        'allowed_file_types',
        'rush_surcharge_type',
        'rush_surcharge_amount',
        'turnaround_time',
        'rush_turnaround_time',
        'sort_order',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'rush_surcharge_amount' => 'decimal:2',
        'min_quantity' => 'integer',
        'max_file_size_mb' => 'integer',
        'allowed_file_types' => 'array',
        'sort_order' => 'integer',
    ];

    public function specifications(): HasMany
    {
        return $this->hasMany(PrintServiceSpecification::class, 'service_id')->orderBy('sort_order');
    }

    public function printOrders(): HasMany
    {
        return $this->hasMany(PrintOrder::class, 'service_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
