# pipeline/ — the one order pipeline

Everything the **kiosk**, the **cashier (pos)** and the **kitchen display (kds)** share lives here once, so the three systems can never disagree about a price, a menu name or an order's status. Modules call the pipeline; the pipeline never calls a module.

```
Kiosk ─┐                                         ┌─▶ KDS ticket
       ├─▶ menu ─▶ pricing ─▶ numbering ─▶ orders ┤
POS  ──┘                                         └─▶ status (preparing → completed …)
```

| File | Does | Design | Status |
|---|---|---|---|
| `menu.ts` | Reads the menu (categories → items → extras, names in en / zh / ko with English fallback, extra price = `price_override ?? price`, sold-out kept with `available: false`); sold out / back in for items and extras | §5.1, §7.6, decision 19 | ✅ |
| `pricing.ts` | Re-exports the shared pricing engine (`packages/shared/utils/pricing.ts`): line totals, discounts (percent / fixed voucher / Senior · PWD with group share), VAT split, total due — centavos, pure. Shared so the register's preview can't disagree with the charge | §7.6 | ✅ |
| `numbering.ts` | Next order number with `SELECT … FOR UPDATE` on `order_sequences` inside the order's transaction → `ORD-000749`; `displayNo` → `000749` | §7.7 | ✅ |
| `orders.ts` | `placeOrder` (kiosk / walk-in: idempotent, merged lines, 409 ITEM_UNAVAILABLE / TOTAL_CHANGED, discount, payment, one transaction), `settleOrder` (scanned kiosk order → paid → preparing; kiosk prices kept unless lines changed), `getOrder` (with discount + payment) | §5.8, §7.2–7.5 | ✅ |
| `discounts.ts` | The discount button → pricing rule + `order_discounts` row: Student %, Senior / PWD (ID + name, group share), voucher (active, dates, uses, min spend) | §7.5–7.6, decisions 11–12 | ✅ |
| `payments.ts` | `checkPayment` (cash ≥ total → change; GCash / card reference no.) and `recordPayment` | §7.5–7.6, decision 17 | ✅ |
| `status.ts` | `ALLOWED` moves (§4.4), `moveStatus` (only while still `from` → else 409; stamps the time; clears a register lock; logs), `logEvent` | §4.4 | ✅ |

## Rules

- **No HTTP here** — no `request`, `reply` or routes. Pipeline functions take plain values (store id, ids, quantities) and return plain data; they throw `ApiError` for business errors.
- **Prices are decided here only.** A price, total or discount sent by a screen is never trusted (design §7.1).
- **SQL sits in one exported `queries` object per file**, so a test can swap a query: see `src/test/pipeline-menu.test.ts`.
- Something only one screen needs belongs in that screen's module, not here.
