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
| `pricing.ts` | Line totals, merging lines, discounts (Student, Senior / PWD, voucher), VAT split, total due — in centavos | §7.6 | QB-005 |
| `numbering.ts` | Next order number with `SELECT … FOR UPDATE` on `order_sequences` → `ORD-000749` | §7.7 | QB-005 |
| `orders.ts` | Save / load orders, lines, extras, discount, payment in one transaction | §6.4, §7.3 | QB-005 |
| `status.ts` | Allowed status changes (awaiting payment → preparing → completed, recall, cancel, void) + `order_status_events` | §4.4 | QB-005 / QB-008 |

## Rules

- **No HTTP here** — no `request`, `reply` or routes. Pipeline functions take plain values (store id, ids, quantities) and return plain data; they throw `ApiError` for business errors.
- **Prices are decided here only.** A price, total or discount sent by a screen is never trusted (design §7.1).
- **SQL sits in one exported `queries` object per file**, so a test can swap a query: see `src/test/pipeline-menu.test.ts`.
- Something only one screen needs belongs in that screen's module, not here.
