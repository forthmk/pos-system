# pages/Reports — Shift Sales & Z-Reading

Design §5.7, §7.9, decisions 14–18, UI reference "Sales Analytics & Shift Z-Reading Reports". Route `/reports` (`reports.view`), reached from the register's **Menu | Reports** switch (`components/pos/RegisterTabs.tsx`) or the Home card.

| File | What |
|---|---|
| `Reports.tsx` | the page: shift picker (open now / Z-0001 …), Print X / Z-reading, Close Shift, Export CSV / Z-Read |
| `components/StatCards.tsx` | Gross Shift Sales + vs yesterday · Total Transactions (IN • OUT) · Average Ticket Value (items / order) · GCash Digital Share (Cash • Card) |
| `components/TenderBars.tsx` | Tender Reconciliation: GCash E-Wallet / Cash Drawer / Credit-Debit Card with share bars |
| `components/AuditLog.tsx` | Transaction Audit Log, newest first; voided orders stay (VOID, struck through); **Void** per row while the shift is open |
| `components/CashPanel.tsx` | Cash drawer (starting, cash sales, refunds, expected, counted, over / short) and the X-reading (live) or saved Z-reading |
| `components/CloseShiftDialog.tsx` | counted cash → live over / short preview → Close shift & save Z-reading → done step with Print Z-reading |
| `components/VoidDialog.tsx` | reason + manager username + PIN; says what will be refunded |
| `format.ts` | `₱14,820.00`, `Z-0001`, times |

**Who sees what:** a cashier sees only their own shifts and can close their own; Export CSV / Z-Read shows for managers (`reports.export`); Void shows for the register (`orders.settle`) and needs a manager's PIN. **Live:** `useLiveFeed()` refreshes the figures on `order.sent_to_kitchen`, `order.voided`, `shift.closed`.

**Printing** (`utils/printZReading.ts`, 58 mm) happens only when tapped: the browser's print window pauses the page until it is closed, so nothing prints by itself after Close Shift.

Data: `useShifts`, `useShiftReport`, `useCloseShift`, `useVoidOrder`, `useExportShiftCsv` (`hooks/api/usePos.ts`). Server: `apps/api/src/pipeline/reports.ts` + `modules/pos`.
