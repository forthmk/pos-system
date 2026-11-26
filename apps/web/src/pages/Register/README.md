# pages/Register — the cashier register

Design §5.3–5.4, §5.10. Route `/register` (`DefaultLayout`, permission `orders.settle` — cashier, manager, admin). Linked from `/home`.

```
Register.tsx   QB-006: scan a kiosk slip (hooks/useScannerInput — the scanner types 12 digits + Enter
               anywhere on the page) or type its code → the order on the receipt panel, locked to
               this register; CLEAR unlocks it. Already paid / expired / voided / at another register
               are shown as notices. The check digit is checked here before asking the server.
```

Coming in QB-007: menu tiles + SKU search, walk-in tickets, IN / OUT, discounts (PWD, Voucher, Student, Senior), GCash / Cash / Card with change, settling scanned orders, Kiosk # list, shifts, receipt printing.

Data: `useScanSlip`, `useReleaseOrder` (`hooks/api/usePos.ts`). Server: `apps/api/src/modules/pos`.
