# modules/kiosk — the self-service kiosk

The API behind the customer's kiosk (design §5.1, UI references 1–5). Shared work goes through `src/pipeline/`.

| Method | Path | Who | Does | Status |
|---|---|---|---|---|
| GET | `/api/kiosk/menu?lang=en\|zh\|ko` | `menu.view` (kiosk + staff) | the whole menu in one call + kiosk settings (idle / reset seconds, online payment) | ✅ |
| POST | `/api/kiosk/orders` | kiosk | place an order (picks only — the pipeline prices it) | QB-005 |
| GET | `/api/kiosk/orders/:id` | kiosk | order status for the Order Sent screen | QB-005 |
| POST | `/api/kiosk/orders/:id/slip-printed` | kiosk | the order slip was printed | QB-006 |
| GET | `/api/kiosk/board` | kiosk | Orders board: Preparing / Ready numbers | QB-008 |

Files: `kiosk.routes` · `kiosk.controller` · `kiosk.service` · `kiosk.schema` (no repository yet — everything it reads comes from the pipeline). Screens: `apps/web/src/pages/Kiosk/`. Client: `packages/shared/api/kiosk.ts`.
