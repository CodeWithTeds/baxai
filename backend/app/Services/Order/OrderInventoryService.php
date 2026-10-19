<?php

namespace App\Services\Order;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use App\Models\Product;

class OrderInventoryService
{
    /**
     * Reserve stock for an order.
     *
     * Locks the product rows inside the current transaction so concurrent
     * checkouts cannot oversell the same stock. Duplicate lines for the same
     * product are aggregated before comparing against availability.
     *
     * @param  array<int, array{product_id: int|string|null, quantity: int|string}>  $items
     *
     * @throws InsufficientStockException
     */
    public function reserve(array $items): void
    {
        $required = $this->aggregateQuantities($items);

        if (empty($required)) {
            return;
        }

        $products = Product::whereIn('id', array_keys($required))
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($required as $productId => $quantity) {
            $product = $products->get($productId);

            if (! $product || ! $product->track_inventory) {
                continue;
            }

            if ($product->stock_quantity < $quantity) {
                throw new InsufficientStockException($product, $quantity);
            }

            $product->decrement('stock_quantity', $quantity);
        }
    }

    /**
     * Return reserved stock to inventory when an order is cancelled.
     */
    public function restore(Order $order): void
    {
        foreach ($order->items as $item) {
            if (! $item->product_id) {
                continue;
            }

            $product = Product::find($item->product_id);

            if ($product && $product->track_inventory) {
                $product->increment('stock_quantity', $item->quantity);
            }
        }
    }

    /**
     * @param  array<int, array{product_id: int|string|null, quantity: int|string}>  $items
     * @return array<int, int>
     */
    private function aggregateQuantities(array $items): array
    {
        $required = [];

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? null;

            if (! $productId || ! is_numeric($productId)) {
                continue;
            }

            $key = (int) $productId;
            $quantity = (int) ($item['quantity'] ?? 1);

            $required[$key] = ($required[$key] ?? 0) + $quantity;
        }

        return $required;
    }
}
