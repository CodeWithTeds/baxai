# Order Inventory & Stock Management

How product stock is reserved, deducted, and restored across the order
lifecycle. Applies to `POST /api/v1/orders` (mobile app) and the web admin
order status transitions.

## 1. Behavior summary

| Event | Stock effect | Notes |
|---|---|---|
| Order placed (`in_progress`) | **Deducted** | Only for products with `track_inventory = true`. |
| `in_progress` → `processing` | No change | Courier/tracking required. |
| `processing` → `delivered` | No change | Sets `delivered_at` and `payment_status = paid`. Stock stays deducted. |
| Any → `cancelled` | **Restored** | Only if the order was not already `cancelled`. |
| `delivered` → `cancelled` | Rejected (422) | Delivered orders can never be cancelled. |

**Key point:** a delivered order keeps its stock deducted. Only cancellation
returns stock to inventory. This is intentional — the goods have left the
warehouse.

## 2. Reservation at checkout

Stock is reserved inside the order-creation DB transaction by
`App\Services\Order\OrderInventoryService::reserve()`:

- Duplicate line items for the same `product_id` are **aggregated** before
  comparing against availability (3 + 3 = 6 requested).
- Product rows are locked with `lockForUpdate()` so two concurrent checkouts
  cannot oversell the same units.
- Products with `track_inventory = false`, or items without a `product_id`
  (fully custom orders), are skipped.
- If any tracked product cannot cover the requested quantity, an
  `InsufficientStockException` is thrown, the transaction rolls back, and **no
  order is created and no stock changes**.

This replaces the previous behavior, which silently deducted
`min(requested, available)` and still created the order for the full quantity.

### Error contract (HTTP 422)

```json
{
  "status": "error",
  "error_code": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for \"Custom Mug\". Requested 5, but only 3 available.",
  "action": "adjust_quantity",
  "product_id": 42,
  "product_name": "Custom Mug",
  "requested": 5,
  "available": 3
}
```

The exception is rendered centrally in `App\Exceptions\ApiExceptionHandler`,
so every `api/*` caller receives the same shape.

## 3. Restoration on cancellation

`OrderInventoryService::restore()` increments stock back by each order item's
quantity for tracked products. It is called from:

- `Api\OrderController::cancel()` (mobile/web cancel endpoint)
- `Api\OrderController::updateStatus()` when transitioning to `cancelled`
- `OrderController::updateStatus()` (web admin)
- `OrderController::bulkUpdateStatus()` (web admin bulk cancel)

Guards ensure stock is only restored once: the restore is skipped when the
order is already `cancelled`.

## 4. Files

| File | Change |
|---|---|
| `app/Services/Order/OrderInventoryService.php` | New — `reserve()` and `restore()`. |
| `app/Exceptions/InsufficientStockException.php` | New — carries product/requested/available and renders the 422 payload. |
| `app/Http/Controllers/Api/OrderController.php` | Calls `reserve()` inside the store transaction; uses `restore()` on cancel/status. |
| `app/Http/Controllers/OrderController.php` | Uses `restore()` on single and bulk cancel. |
| `app/Exceptions/ApiExceptionHandler.php` | Renders `InsufficientStockException` as JSON 422. |
| `tests/Feature/OrderInventoryTest.php` | New — covers deduction, rejection, aggregation, non-tracked, restore, delivered. |

## 5. Client handling

The mobile app already surfaces backend error messages via its generic
checkout `Alert` (`mobile/app/app/cart.tsx:168-188`). For
`INSUFFICIENT_STOCK`, the alert shows the message and `action: adjust_quantity`
signals the client to let the user reduce the quantity. No API shape change is
required.

## 6. Verification

```bash
cd backend
php artisan test --filter=OrderInventoryTest
php artisan test                       # full suite (92 passing)
composer lint                          # Pint
```

Manual:

- [ ] Order 5 units of a product with 3 in stock → 422 `INSUFFICIENT_STOCK`,
      stock unchanged, no order created.
- [ ] Order 3 units of a product with 3 in stock → 201, stock becomes 0.
- [ ] Cancel an `in_progress` order → stock restored to original.
- [ ] Mark an order `delivered` → stock remains deducted; cancel attempt → 422.
