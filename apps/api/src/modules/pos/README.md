# modules/pos — the cashier register

The API behind the cashier register (design §5.3–5.4, §5.7, §5.10). Shared work — menu, discounts, pricing, numbering, orders, payments, statuses — goes through `src/pipeline/`. Every endpoint except the menu needs a cashier **signed in at a register** (`POS-01`; else 400 NO_REGISTER); selling also needs that register's **shift open** (else 409 NO_OPEN_SHIFT).

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/api/pos/menu` | `menu.view` | the menu in English with SKU codes |
| PATCH | `/api/pos/menu-items/:id/availability` · `/api/pos/addons/:id/availability` | `menu.availability` | sold out / back in |
| GET | `/api/pos/shifts/current` | `shifts.use` | this register's open shift, or `null` |
| POST | `/api/pos/shifts/open` | `shifts.use` | `{ opening_cash }` — one open shift per register (409 SHIFT_OPEN) |
| GET | `/api/pos/discount-types` | `orders.create` | the discount buttons: Regular, PWD, Voucher, Student, Senior |
| POST | `/api/pos/vouchers/validate` | `orders.create` | `{ code, subtotal }` → what it takes off; 409 VOUCHER_INVALID with the reason |
| GET | `/api/pos/next-number` | `orders.create` | ORD-000750 preview for the receipt header (the real number is given on save) |
| GET | `/api/pos/orders?status=awaiting_payment` | `orders.settle` | the **Kiosk #** list: kiosk orders waiting for payment (within the expiry), with slip code and which register holds them |
| POST | `/api/pos/orders` | `orders.create` | walk-in order + discount + payment → **preparing** (sent to the kitchen). 201 / 200 same client_ref · 409 ITEM_UNAVAILABLE / VOUCHER_INVALID · 422 INSUFFICIENT_CASH |
| POST | `/api/pos/orders/:id/settle` | `orders.settle` | take payment for a scanned kiosk order (+ discount, + changed `lines`) → **preparing**. 409 NOT_AWAITING / IN_USE |
| POST | `/api/pos/orders/:id/cancel` | `orders.cancel` | cancel an unpaid order |
| GET | `/api/pos/scan/:code` | `orders.settle` | a kiosk slip: `ready` (locked here) · `already_paid` · `expired` (cancelled after `awaiting_payment_expiry_minutes`) · `voided` · `in_use` |
| POST | `/api/pos/orders/:id/release` | `orders.settle` | unlock a scanned order (only this register's lock) |
| … | void, close shift / Z-reading, reports, export | manager | QB-009 |

Files: `pos.routes` · `pos.controller` · `pos.service` · `pos.schema` · `pos.repository` (scan lookup, lock, shifts, Kiosk # list, last number). Screens: `apps/web/src/pages/Register/`. Client: `packages/shared/api/pos.ts`.
