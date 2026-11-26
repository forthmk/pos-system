# pages/Kiosk — the self-service kiosk screens

Design §5.1, UI references 1–5. Route `/kiosk` (full-screen `KioskLayout`, permission `orders.create`); a paired kiosk opening `/home` is sent here.

```
Kiosk.tsx            screen state: start → menu → item → cart → sent; Proceed Order (one client_ref per cart);
                     Cancel and "Still there?" reset
cart.ts              the cart: picks only (item ID, qty, extra IDs); same item + extras merge;
                     prices read from the menu in centavos (preview — the API prices the order)
components/
  StartScreen.tsx    clock, Orders (n), IN / OUT, English / 中文 / 한국어
  OrdersBoard.tsx    Orders board: Preparing / Ready numbers, live; closes itself after 1 min
  MenuScreen.tsx     categories, item cards (sold out greyed), Cancel + View Cart
  KioskTopBar.tsx    IN • Dine-In ⇄, language, cart count
  ItemScreen.tsx     qty − / +, extras, Add to Order
  CartScreen.tsx     lines, qty (0 removes), GCash / Cash / Card, total, Proceed Order + errors
  OrderSentScreen.tsx  number, mode, payment, items, total, time, barcode, countdown; prints the order slip
                     once (utils/printSlip.ts, 80 mm, Code 128) + Reprint slip
  QtyStepper.tsx · MenuIcon.tsx
```

Text is in `public/locales/{en,zh,ko}/translation.json` under `kiosk.*`; menu names come from the API in the chosen language. Data: `useKioskMenu(lang)` (`hooks/api/useKiosk.ts`), `useOrdersBoard()` (`hooks/api/useKds.ts`), both refreshed live by `useLiveFeed()` (sold out greys at once; the board moves as the kitchen bumps). Idle reset: `hooks/useIdleReset.ts`.
