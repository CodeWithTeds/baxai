<?php

namespace App\Exceptions;

use App\Models\Product;
use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly Product $product,
        public readonly int $requested,
    ) {
        parent::__construct(sprintf(
            'Insufficient stock for "%s". Requested %d, but only %d available.',
            $product->name,
            $requested,
            max(0, $product->stock_quantity),
        ));
    }

    public function toArray(): array
    {
        return [
            'status' => 'error',
            'error_code' => 'INSUFFICIENT_STOCK',
            'message' => $this->getMessage(),
            'action' => 'adjust_quantity',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'requested' => $this->requested,
            'available' => max(0, $this->product->stock_quantity),
        ];
    }
}
