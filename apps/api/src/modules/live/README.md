# modules/live — the live feed

`GET /api/live?token=<JWT>` (WebSocket). Every screen — kiosk, register, kitchen display — connects once; the pipeline publishes order and menu events (`src/pipeline/live.ts`, design §8.2) and each screen refreshes its data. The token is checked like any request (switched-off user / unpaired screen → closed with 4401). A ping every 25 s keeps the connection open.

Message: `{ event, data, server_time }` — events: `live.ready`, `order.created`, `order.sent_to_kitchen`, `order.locked`, `order.released`, `order.completed`, `order.recalled`, `order.cleared`, `order.cancelled`, `menu.availability`.

Client: `apps/web/src/hooks/useLiveFeed.ts`.
