# pages/Register — the cashier register

Design §5.3–5.4, §5.7, §5.10 and the UI reference "Cashier Register — Menu & Order Entry". Route `/register` (`DefaultLayout`, permission `orders.settle` — cashier, manager, admin), linked from `/home`. The cashier must be signed in **at a register** (POS-01).

```
Register.tsx          the page: shift check → menu + receipt + action bar; scanner; PROCEED;
                      Payment Settled; prints the receipt (utils/printReceipt.ts, 58 mm)
ticket.ts             the ticket: walk-in lines (same rules as the kiosk cart) or a scanned kiosk
                      order (kiosk prices kept); discount; tender; totals from the SHARED pricing
                      engine (@shared/utils pricing — the same code the API charges with)
components/
  MenuPanel.tsx       category tabs, Search SKU…, tiles (SKU, BESTSELLER, price, + Add, "1x", sold out)
  ReceiptPanel.tsx    RECEIPT · IN/OUT · ORD-…; rate label; lines − / +; Cash + Exact + Change or the
                      GCash / card ref no.; Subtotal, Discount, TOTAL DUE; errors
  ActionBar.tsx       IN · OUT · PWD · Voucher · Student · Senior / GCash · Cash · Card · CLEAR ·
                      PROCEED · Kiosk #nnn (with how many are waiting)
  Dialogs.tsx         Open shift (starting cash) · Senior / PWD (ID, name, diners) · Voucher (checked
                      by the server) · Extras picker · Kiosk # list · Payment Settled
```

Rules: one discount at a time (tap it again to remove); a scanned kiosk order keeps its IN / OUT and prices (CLEAR to ring up a new ticket); PROCEED is enabled only when the cash covers the total or a 6+ character reference is typed; one `client_ref` per ticket so a retried PROCEED can't charge twice.

Data: `hooks/api/usePos.ts`. Server: `apps/api/src/modules/pos`. Coming: void (manager), close shift + Z-reading, reports (QB-009).
