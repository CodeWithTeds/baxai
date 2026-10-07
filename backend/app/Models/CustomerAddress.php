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
        'latitude',
        'longitude',
        'delivery_instructions',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'region_code' => 'string',
        'province_code' => 'string',
        'city_code' => 'string',
        'barangay_code' => 'string',
        'latitude' => 'float',
        'longitude' => 'float',
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

    protected static function booted(): void
    {
        static::saving(function (CustomerAddress $address) {
            $addressFieldsDirty = $address->isDirty([
                'street_address',
                'barangay_name',
                'city_name',
                'province_name',
                'region_name',
                'postal_code',
            ]);

            if (($addressFieldsDirty || (is_null($address->latitude) && is_null($address->longitude))) && $address->isComplete()) {
                $address->geocode();
            }
        });
    }

    public function geocode(): bool
    {
        $queries = array_unique(array_filter([
            // Tier 1: Full address
            implode(', ', array_filter([
                $this->street_address,
                $this->barangay_name ? "Barangay {$this->barangay_name}" : null,
                $this->city_name,
                $this->province_name,
                'Philippines',
            ])),
            // Tier 2: Barangay + City + Province
            implode(', ', array_filter([
                $this->barangay_name ? "Barangay {$this->barangay_name}" : null,
                $this->city_name,
                $this->province_name,
                'Philippines',
            ])),
            // Tier 3: City + Province
            implode(', ', array_filter([
                $this->city_name,
                $this->province_name,
                'Philippines',
            ])),
            // Tier 4: Province
            implode(', ', array_filter([
                $this->province_name,
                'Philippines',
            ])),
        ]));

        foreach ($queries as $query) {
            if (empty(trim($query))) continue;

            try {
                $response = \Illuminate\Support\Facades\Http::withHeaders([
                    'User-Agent' => 'PlacidesApp/1.0 (contact@placides.local)',
                ])->timeout(4)->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $query,
                    'format' => 'jsonv2',
                    'limit' => 1,
                    'countrycodes' => 'ph',
                ]);

                if ($response->successful() && ! empty($response->json())) {
                    $first = $response->json()[0];
                    if (isset($first['lat'], $first['lon'])) {
                        $this->latitude = (float) $first['lat'];
                        $this->longitude = (float) $first['lon'];
                        return true;
                    }
                }
            } catch (\Throwable $e) {
                // Ignore failure and continue to next fallback tier
            }
        }

        return false;
    }

    /**
     * Compute Haversine distance in kilometers to another set of coordinates.
     */
    public function distanceTo(?float $latitude, ?float $longitude): ?float
    {
        if (is_null($this->latitude) || is_null($this->longitude) || is_null($latitude) || is_null($longitude)) {
            return null;
        }

        $dLat = deg2rad($latitude - $this->latitude);
        $dLon = deg2rad($longitude - $this->longitude);

        $a = sin($dLat / 2) ** 2 +
            cos(deg2rad($this->latitude)) * cos(deg2rad($latitude)) *
            sin($dLon / 2) ** 2;

        return 6371 * 2 * asin(sqrt($a));
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
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'delivery_instructions' => $this->delivery_instructions,
            'formatted_address' => $this->formatted_address,
        ];
    }
}
