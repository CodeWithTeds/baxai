<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerAddress extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'customer_id',
        'is_default',
        'recipient_name',
        'phone_number',
        'region_code',
        'region_name',
        'province_code',
        'province_name',
        'city_code',
        'city_name',
        'barangay_code',
        'barangay_name',
        'street_address',
        'postal_code',
        'delivery_instructions',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'region_code' => 'string',
        'province_code' => 'string',
        'city_code' => 'string',
        'barangay_code' => 'string',
    ];

    protected $appends = [
        'formatted_address',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_address_id');
    }

    public function getFormattedAddressAttribute(): string
    {
        $parts = array_filter([
            $this->street_address,
            $this->barangay_name ? "Brgy. {$this->barangay_name}" : null,
            $this->city_name,
            $this->province_name,
            $this->postal_code,
            $this->region_name ? "({$this->region_name})" : null,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Check if all required Philippine address fields are present.
     */
    public function isComplete(): bool
    {
        $hasProvince = ! empty($this->province_code) && ! empty($this->province_name);
        $isNcr = (string) $this->region_code === '1300000000' || str_contains((string) $this->region_name, 'NCR');

        return ! empty($this->region_code)
            && ! empty($this->region_name)
            && ($hasProvince || $isNcr)
            && ! empty($this->city_code)
            && ! empty($this->city_name)
            && ! empty($this->barangay_code)
            && ! empty($this->barangay_name)
            && ! empty(trim($this->street_address ?? ''));
    }

    /**
     * Create an immutable snapshot for order preservation.
     */
    public function toSnapshot(): array
    {
        return [
            'address_id' => $this->id,
            'recipient_name' => $this->recipient_name,
            'phone_number' => $this->phone_number,
            'region_code' => (string) $this->region_code,
            'region_name' => $this->region_name,
            'province_code' => (string) $this->province_code,
            'province_name' => $this->province_name,
            'city_code' => (string) $this->city_code,
            'city_name' => $this->city_name,
            'barangay_code' => (string) $this->barangay_code,
            'barangay_name' => $this->barangay_name,
            'street_address' => $this->street_address,
            'postal_code' => $this->postal_code,
            'delivery_instructions' => $this->delivery_instructions,
            'formatted_address' => $this->formatted_address,
        ];
    }
}
