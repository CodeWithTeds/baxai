<?php

namespace App\Models;

use App\Enums\PrintCategoryStatus;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'slug',
    'code',
    'description',
    'icon',
    'status',
    'sort_order',
])]
class PrintCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => PrintCategoryStatus::class,
            'sort_order' => 'integer',
        ];
    }

    public function printItems(): HasMany
    {
        return $this->hasMany(PrintItem::class, 'category_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', PrintCategoryStatus::ACTIVE->value);
    }
}
