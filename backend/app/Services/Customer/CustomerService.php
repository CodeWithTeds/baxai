<?php

namespace App\Services\Customer;

use App\Models\Customer;
use App\Repositories\CustomerRepositoryInterface;
use Illuminate\Support\Str;

class CustomerService
{
    public function __construct(protected CustomerRepositoryInterface $customers) {}

    public function create(array $attributes): mixed
    {
        $attributes['customer_code'] = $this->ensureCustomerCode($attributes);
        $attributes = $this->normalize($attributes);

        return $this->customers->create($attributes);
    }

    public function update(mixed $customer, array $attributes): bool
    {
        if (empty($attributes['customer_code']) && $customer instanceof Customer) {
            $attributes['customer_code'] = $customer->customer_code;
        }
        $attributes = $this->normalize($attributes, $customer);

        return $this->customers->update($customer, $attributes);
    }

    public function activate(array $ids): int
    {
        return $this->customers->bulkUpdateStatus($ids, 'active');
    }

    public function deactivate(array $ids): int
    {
        return $this->customers->bulkUpdateStatus($ids, 'inactive');
    }

    public function archive(array $ids): int
    {
        return $this->customers->bulkUpdateStatus($ids, 'archived');
    }

    private function ensureCustomerCode(array $attributes): string
    {
        if (! empty($attributes['customer_code'])) {
            return strtoupper(trim((string) $attributes['customer_code']));
        }

        $name = (string) ($attributes['name'] ?? 'Customer');
        $base = Str::upper(Str::slug($name));
        $base = $base !== '' ? $base : 'CUST';
        $base = Str::limit(str_replace('-', '', $base), 8, '');

        $prefix = match ($attributes['type'] ?? null) {
            'business' => 'BIZ',
            'vip' => 'VIP',
            'wholesale' => 'WHL',
            default => 'CUST',
        };

        return $prefix.'-'.$base.'-'.Str::upper(Str::random(4));
    }

    private function normalize(array $attributes, mixed $customer = null): array
    {
        foreach (['total_orders' => 0, 'total_spent' => 0.00, 'sort_order' => 0] as $key => $default) {
            if (array_key_exists($key, $attributes) && $attributes[$key] === null) {
                $attributes[$key] = $default;
            }
        }

        if (isset($attributes['email'])) {
            $attributes['email'] = strtolower(trim((string) $attributes['email']));
        }

        return $attributes;
    }
}
