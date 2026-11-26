# pages/Kitchen — the kitchen display (KDS)

Design §5.5–5.6, §7.8, UI reference "Kitchen Display". Route `/kitchen` (full screen, `kds.use`). A paired KDS screen opens here from `/home`; a chef or manager reaches it from the Home card.

| File | What |
|---|---|
| `Kitchen.tsx` | the page: header, Pending queue, Completed Orders (drop zone), Clear Served, the floating card while dragging |
| `components/KitchenHeader.tsx` | QUICKBITE KDS · station + LIVE / OFFLINE · Pending / Completed / Avg Prep · clock · Workflow strip and legend. "+ New Kiosk Order" is hidden (decision 10, `SHOW_DEMO_ORDER_BUTTON`) |
| `components/TicketCard.tsx` | one ticket: ✓, IN / OUT, number, qty × name + extras, timer (red after `kds_delay_minutes`), Served + Recall (within `kds_recall_minutes`) |
| `useTicketDrag.ts` | pointer-events drag for mouse, finger and pen; mouse drags the whole card, a finger drags the "⠿ Drag or Tap ✓" handle (so the page still scrolls) |
| `useNow.ts` · `time.ts` | the server's clock (`clockOffset` from the live feed), `00:04:16` / `02:14` formats |

**Data:** `useKdsTickets(station)` (`hooks/api/useKds.ts`), refreshed by the live feed (`hooks/useLiveFeed.ts`) on `order.sent_to_kitchen`, `order.completed`, `order.recalled`, `order.cleared`. Complete / recall move the ticket on screen at once and roll back if the server says no.

**Station:** `?station=<id>` → the KDS screen's own → the KDS terminal a chef signed in at → every station (decided by the API).

**Offline:** the header turns red ("OFFLINE — RECONNECTING"); on reconnect every open ticket reloads.
