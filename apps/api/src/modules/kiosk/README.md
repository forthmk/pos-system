# modules/kiosk — the self-service kiosk

The API behind the customer's kiosk (design §5.1, UI references 1–5). Shared work goes through `src/pipeline/`.

| Method | Path | Who | Does | Status |
|---|---|---|---|---|
| GET | `/api/kiosk/menu?lang=en\|zh\|ko` | `menu.view` (kiosk + staff) | the whole menu in one call + kiosk settings (idle / reset seconds, online payment) | ✅ |
| POST | `/api/kiosk/orders` | a paired kiosk (`orders.create`) | place an order: picks only, the pipeline prices it; saved as **awaiting payment** (paid at the counter). 201 new · 200 same client_ref again · 409 ITEM_UNAVAILABLE / TOTAL_CHANGED · 403 if not a kiosk screen | ✅ |
| GET | `/api/kiosk/orders/:id` | a paired kiosk | the order (number, status, lines, totals) | ✅ |
| POST | `/api/kiosk/orders/:id/slip-printed` | a paired kiosk | the order slip was printed (first time kept) + `slip_printed` event | ✅ |
| GET | `/api/kiosk/board` | kiosk | Orders board: Preparing / Ready numbers | QB-008 |

Files: `kiosk.routes` · `kiosk.controller` · `kiosk.service` · `kiosk.schema` · `kiosk.repository` (slip printed). Menu and orders come from the pipeline. Screens: `apps/web/src/pages/Kiosk/`. Client: `packages/shared/api/kiosk.ts`.
