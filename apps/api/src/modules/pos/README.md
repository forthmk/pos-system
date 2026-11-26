# modules/pos — the cashier register

The API behind the cashier register (design §5.3–5.4, §5.7, §5.10). Shared work goes through `src/pipeline/`.

| Method | Path | Who | Does | Status |
|---|---|---|---|---|
| GET | `/api/pos/menu` | `menu.view` | the menu in English with SKU codes | ✅ |
| PATCH | `/api/pos/menu-items/:id/availability` | `menu.availability` (cashier, manager, admin) | item sold out / back in | ✅ |
| PATCH | `/api/pos/addons/:id/availability` | `menu.availability` | extra sold out / back in | ✅ |
| POST | `/api/pos/orders` | `orders.create` | walk-in order + payment | QB-005 |
| GET | `/api/pos/scan/:code` | `orders.settle`, signed in at a register | read a kiosk slip (12 digits, dashes ok): `ready` (locked here `order_lock_minutes`) · `already_paid` · `expired` (not paid within `awaiting_payment_expiry_minutes` → cancelled by the system) · `voided` · `in_use` (another register). 400 BAD_CODE · 404 SLIP_NOT_FOUND | ✅ |
| POST | `/api/pos/orders/:id/release` | `orders.settle` | unlock a scanned order (only this register's lock) | ✅ |
| PUT / POST | `/api/pos/orders/:id/lines` · `/settle` · `/cancel` · `/void` | cashier / manager | review, take payment, cancel, void | QB-007 |
| … | `/api/pos/shifts/*`, `/api/pos/reports/*` | cashier / manager | open / close shift, Z-reading, export | QB-007 / QB-009 |

Files: `pos.routes` · `pos.controller` · `pos.service` · `pos.schema` · `pos.repository` (scan lookup, register lock). Screens: `apps/web/src/pages/Register/` (QB-007). Client: `packages/shared/api/pos.ts`.
