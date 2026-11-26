# modules/kds — the kitchen display

The chef's screen (design §5.5–5.6, §7.8). The work lives in `src/pipeline/kitchen.ts`; this module checks who is acting and announces each change on the live feed (`pipeline/live.ts`), so the board, the register and other kitchen screens update at once.

| Method | Path | Permission | What it does |
|---|---|---|---|
| GET | `/api/kds/tickets?station=` | `kds.use` | `{ station, tickets, stats {pending, completed, avg_prep_seconds}, settings {delay_minutes, recall_minutes}, server_time }` — paid orders not yet cleared |
| POST | `/api/kds/orders/:id/complete` | `kds.use` | ✓ / dragged to Completed: preparing → completed (`order.completed`) |
| POST | `/api/kds/orders/:id/recall` | `kds.use` | completed → preparing within `kds_recall_minutes` (10), before Clear Served (`order.recalled`) |
| POST | `/api/kds/clear-served` | `kds.use` | every completed ticket off the display and the board (`order.cleared`) |

- **Station:** `?station=` wins; otherwise a paired KDS screen — or a chef signed in at one (EXPO-01) — shows that screen's station; anyone else sees every station. Lines with no station show everywhere.
- **Tickets carry no prices:** number, IN / OUT, source, qty × name + extras, sent / completed times.
- **Timers:** red after `kds_delay_minutes` (5). The screen counts from `sent_to_kitchen_at` using `server_time`, not its own clock.
- **Who:** the KDS screen and chefs log as `chef`, managers / admins as `manager` (order_status_events).
- **Errors (409):** `NOT_PREPARING`, `NOT_COMPLETED`, `RECALL_EXPIRED`, or the order was changed on another screen.

The Orders board numbers (`GET /api/kiosk/board`) come from the same pipeline file.
