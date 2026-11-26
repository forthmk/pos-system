# packages/shared/api — the web app's API calls

One file per backend module (`apps/api/src/modules/*`), re-exported by `index.ts`:

| File | Export | Backend |
|---|---|---|
| `auth.ts` | `authApi` — `pinLogin`, `device`, `me`, `terminals`, `pairTerminal` | `modules/auth` |
| `kiosk.ts` | `kioskApi` — `menu(lang)`, `placeOrder(body)`, `order(id)`, `slipPrinted(id)` | `modules/kiosk` |
| `pos.ts` | `posApi` — `menu`, sold out, `currentShift` / `openShift`, `discountTypes`, `checkVoucher`, `nextNumber`, `kioskQueue`, `placeOrder`, `settle`, `cancel`, `scan`, `release` | `modules/pos` |
| `kds.ts` | `kdsApi` — `tickets(station?)`, `complete(id)`, `recall(id)`, `clearServed`, `board` | `modules/kds` (+ `GET /kiosk/board`) |

```ts
import { kioskApi } from '@shared/api';
const { data } = await kioskApi.menu('zh');   // data: KioskMenu (@shared/model)
```

Rules: paths and payload types only — caching and invalidation live in `apps/web/src/hooks/api/use<Module>.ts`; components never call these directly. Each file makes its client with `createApi()` (`../axios`, JWT from localStorage). The web reads this folder's source through the `@shared/api` Vite alias (no build needed).
