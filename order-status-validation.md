# Order Status Validation Plan — `/orders` (Web Admin)

Scope: status transitions + courier/tracking. No payment cross-check, no delete guards.

## 1. Current gaps

- `backend/app/Http/Controllers/OrderController.php:92-101` — `updateStatus` validates only `in:` values. Illegal jumps (`delivered → processing`, `cancelled → anything`, `delivered → cancelled`) pass silently.
- Same file `:126-137` — `courier_name` / `tracking_number` always `nullable`, so `processing` / `delivered` can be saved with no courier or tracking.
- Same file `:105-107` — cancel reads `notes` as the reason but it is `nullable`, so empty cancels are allowed.
- Same file `:159-183` — `bulkUpdateStatus` dead guard: line 169 overwrites `$order->status` before line 173 checks `$order->status !== 'cancelled'`. Inventory restore on bulk-cancel never fires correctly. No per-order transition check.
- No `UpdateOrderStatusRequest` exists (print orders have `UpdatePrintOrderStatusRequest.php`). Validation lives inline.
- `backend/resources/js/pages/orders/show.tsx:80-90` — form posts everything, no required markers, no terminal-state disabling.

## 2. Changes

### 2.1 New: `backend/app/Http/Requests/UpdateOrderStatusRequest.php`

```php
authorize(): true // admin auth handled by route middleware
```

`prepareForValidation()`: trim `courier_name`, `tracking_number`.

`rules()`:

| Field | Rule |
|---|---|
| `status` | `required\|in:in_progress,processing,delivered,cancelled` |
| `courier_name` | `required_if:status,processing,delivered\|nullable\|string\|max:100` |
| `tracking_number` | `required_if:status,processing,delivered\|nullable\|string\|max:100` |
| `tracking_url` | `nullable\|url\|max:500` (currently `string` — accepts garbage) |
| `payment_status` | `nullable\|in:pending,paid,failed,refunded` |
| `notes` | `required_if:status,cancelled\|nullable\|string\|max:2000` (cancellation reason) |

`withValidator()` / `after()` transition guard (load `$this->route('order')`):

- current in (`delivered`, `cancelled`) and new ≠ current → `status: Terminal orders cannot change status.`
- current `delivered` + new `cancelled` → `Delivered orders cannot be cancelled.` (explicit message)
- allowed: `in_progress ↔ processing`, `* → delivered`, `in_progress/processing → cancelled`

### 2.2 New: `backend/app/Http/Requests/BulkUpdateOrderStatusRequest.php`

- `ids: required\|array\|min:1\|max:100`
- `ids.*: integer\|distinct\|exists:orders,id`
- `status: required\|in:in_progress,processing,delivered,cancelled`
- Same `required_if` courier/tracking rules as §2.1.
- Strict bulk semantics: if **any** targeted order is terminal and differs from the new status, fail the whole request with 422 listing offending ids. No partial updates.

### 2.3 Edit: `backend/app/Http/Controllers/OrderController.php`

- `updateStatus(UpdateOrderStatusRequest $request, Order $order)` — replace inline `$request->validate([...])` with `$request->validated()`. Remainder unchanged.
- `bulkUpdateStatus(BulkUpdateOrderStatusRequest $request)` — same swap, plus fix dead guard: capture `$oldStatus = $order->status` **before** assignment and use `$oldStatus` in the `cancelled` branch.

### 2.4 Edit (minor): `backend/resources/js/pages/orders/show.tsx`

- Mark `courier_name`, `tracking_number` required when status is `processing`/`delivered`.
- Mark `notes` required when status is `cancelled`.
- Disable `status` Select options once the order is terminal.
- Render `errors.*` from `useForm`. No new components.

## 3. Tests — new `backend/tests/Feature/OrderStatusValidationTest.php`

1. `processing` without courier/tracking → session error on `courier_name`.
2. `delivered` without tracking → error on `tracking_number`.
3. `cancelled` without notes → error on `notes`.
4. `delivered → processing` → rejected (terminal lock).
5. `cancelled → processing` → rejected.
6. Happy path `in_progress → processing` with courier + tracking → passes with success flash.

## 4. Verification

- `php artisan test --filter=OrderStatusValidation`
- `php artisan test --filter=OrderManagementFeatures` (no regressions)
- Manual at `http://127.0.0.1:8000/orders/{id}`:
  - [ ] `processing` with empty courier → validation error
  - [ ] `delivered` with tracking → saves; further status edits → terminal-lock error
  - [ ] `cancelled` with empty notes → validation error
  - [ ] Bulk update including a delivered order → whole batch rejected with offending ids

## 5. Explicitly out of scope

- `delivered ⇒ payment must be paid` cross-check (controller force-sets `paid` on delivery; untouched).
- Delete / bulk-delete guards.
- `tracking_number` uniqueness or courier-specific formats.
- API (`routes/api/v1.php`) validation changes.
