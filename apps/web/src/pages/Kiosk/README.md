# pages/Kiosk — the self-service kiosk screens

Design §5.1, UI references 1–5. Route `/kiosk` (full-screen `KioskLayout`, permission `orders.create`); a paired kiosk opening `/home` is sent here.

```
Kiosk.tsx            screen state: start → menu → item → cart → sent; Proceed Order (one client_ref per cart);
                     Cancel and "Still there?" reset
cart.ts              the cart: picks only (item ID, qty, extra IDs); same item + extras merge;
                     prices read from the menu in centavos (preview — the API prices the order)
components/
  StartScreen.tsx    IN / OUT, English / 中文 / 한국어
  MenuScreen.tsx     categories, item cards (sold out greyed), Cancel + View Cart
  KioskTopBar.tsx    IN • Dine-In ⇄, language, cart count
  ItemScreen.tsx     qty − / +, extras, Add to Order
  CartScreen.tsx     lines, qty (0 removes), GCash / Cash / Card, total, Proceed Order + errors
  OrderSentScreen.tsx  number, Please pay at the counter, mode, payment, items, total, time, countdown
  QtyStepper.tsx · MenuIcon.tsx
```

Text is in `public/locales/{en,zh,ko}/translation.json` under `kiosk.*`; menu names come from the API in the chosen language. Data: `useKioskMenu(lang)` (`hooks/api/useKiosk.ts`). Idle reset: `hooks/useIdleReset.ts`.
