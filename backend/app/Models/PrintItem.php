<?php

namespace App\Models;

use App\Enums\PrintColorMode;
use App\Enums\PrintItemStatus;
use App\Enums\PrintSides;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'category_id',
    'name',
    'item_code',
    'description',
    'paper_type',
    'paper_size',
    'print_sides',
    'color_mode',
    'turnaround_time',
    'base_price',
    'min_quantity',
    'status',
    'notes',
    'sort_order',
])]
class PrintItem extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => PrintItemStatus::class,
            'print_sides' => PrintSides::class,
            'color_mode' => PrintColorMode::class,
            'base_price' => 'decimal:2',
            'min_quantity' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PrintCategory::class, 'category_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', PrintItemStatus::ACTIVE->value);
    }
}
