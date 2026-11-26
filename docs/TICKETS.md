# QuickBite POS — Tickets & Branch Log

Every branch has a ticket here before code is written. Design: [QuickBite-System-Design.docx](QuickBite-System-Design.docx) · Code guide: [CODEBASE.md](CODEBASE.md).

The October 2026 branches (`addFeature/forthvargas/migration/initial-schema`, `…/api/auth`, `…/api/categories`, `…/api/menu-items`, `…/api/tables`, `…/api/orders`, `…/api/payments`) were built for an earlier, simpler design (restaurant tables, inventory). PRs #1–#4 merged some of them into `development` in October; `fixed/forthvargas/migration/revert-october-work` undoes those merges (merge it **before QB-001**). The code stays in git history and on its branches.

---

## How to create a ticket

1. Add an entry under the right status below — **Branch** is mandatory.
2. Cut the branch from `development`:
   ```bash
   git checkout development
   git pull origin development
   git checkout -b <branch-name>
   ```
3. Ready for PR → move to **In Review**. Merged → **Done**.

Branch names: `addFeature|refactor|fixed / forthvargas / <api|page|modal|component|hook|migration|shared> / <what>`.
Build order inside a ticket: migration → API module → shared model / api → hook → UI.
Max **2 PRs merged per day** into `development`.

---

## 🟠 In Review

### QB-001 — Project foundation: scaffold, codebase guide, database migrations

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/migration/quickbite-schema` |
| **Layer** | api + shared + docs |
| **Status** | 🟠 In Review |

**What was built:**
- Monorepo scaffold (root, `apps/api`, `apps/web` shell, `packages/shared`) taken from the October scaffold, without its old schema and modules.
- 4 migrations → the 23 tables of design §6 (`20261125_a…d`), rollback tested (all down, all up).
- Migration runners moved to `src/scripts/` (`migrator.ts`, `migrate.ts`, `migrate-down.ts`) so the runner is never loaded as a migration; Kysely 0.29 `kysely/migration` import.
- `db:gen` → `src/config/database/types.gen.ts`; `database.service.ts` typed `Kysely<DB>`.
- `src/scripts/seed.ts` — store 01, KIOSK-01 / POS-01 / EXPO-01, 4 dev users, default settings, 5 discount types, the mock-up menu (5 categories, 18 items, 4 extras, 1 combo) in en / zh / ko.
- `packages/shared`: barrels for `model/`, `utils/`, `api/` (builds clean).
- Docs: `docs/CODEBASE.md` (structure + commissary reusable code map), `docs/QuickBite-System-Design.docx`, this file; `CLAUDE.md` points to both and records the forthmk / Terminal push rule.

**Checked:** migrate ✓ · rollback ×4 + migrate ✓ · seed ✓ · `tsc` shared ✓ · `tsc` api ✓ · `GET /health` → ok.

---

### QB-002 — Auth: staff PIN sign-in, roles, kiosk / KDS device sign-in

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/api/auth-roles` (cut from QB-001's branch — merge QB-001 first) |
| **Layer** | api + shared |
| **Status** | 🟠 In Review |

**What was built** (design §2.2, §8.1):
- `packages/shared/utils/permissions.ts` — `PERMISSIONS` table (role / screen type → what it may do) and `can()`; used by the API now and by the web's `usePermission` in QB-003.
- `packages/shared/model/auth.model.ts` + `api/auth.ts` — `LoginBody`, `DeviceLoginBody`, `AuthStaff`, `AuthDevice`; `authApi.pinLogin / device / me`, `terminalApi.list / pair`.
- `src/middleware/authentication.ts` — `fastify.authenticate`, `fastify.checkPermission(permission)`; caller re-read from the DB on every request (switched-off user or re-paired screen → 401).
- `POST /api/auth/pin-login` (username + PIN + terminal code; staff can't sign in on the kiosk), `POST /api/auth/device`, `GET /api/auth/me`.
- `GET /api/terminals`, `POST /api/terminals/:id/pair` (admin; kiosk / KDS only; token shown once, SHA-256 stored).
- `utils/loginThrottle.ts` — 5 wrong PINs lock a username for 5 minutes (429).
- Error handler keeps 4xx for schema validation errors (was 500); dev auto-admin token uses the new token shape.
- `src/test/test-utils.ts` (from the commissary) + 26 tests: permissions, auth, terminals.

**Checked:** 26/26 tests · `tsc` shared + api · live API: wrong PIN 401, missing PIN 400, cashier login + /me, cashier → terminals 403, no token 401, admin pair POS 400 / KIOSK 201, kiosk device login + /me, kiosk → terminals 403, old kiosk JWT and token after re-pair 401, staff on kiosk 403.

---

### QB-003 — Web shell: commissary UI kit, PIN sign-in, screen pairing

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/page/web-shell` (cut from QB-002's branch — merge QB-001, QB-002 first) |
| **Layer** | web + shared wiring |
| **Status** | 🟠 In Review |

**What was built** (CODEBASE §6):
- Copied from the commissary: App / store / i18n / theme / tailwind.css + assets/css, `services/api.ts`, form kit, DataTable + Pagination, StatsCard + cards, dialogs + `useConfirm`, Modal, SidePanel, list-page header / search, DateFilter + DatePicker, ui pieces, BlankLayout, Footer, LogoutButton, hooks (`useDebounce`, `useShakeOnError`, `useVisualViewport`, `useKeepDialogsOpen`), utils (`friendlyError` — now also reads the POS API's `{ error }`, `dateOnly`, `exportList` CSV / print, `closestNames`).
- New for the POS: `AuthProvider` (staff PIN session, paired-screen device sign-in, remembered terminal code), `AuthGuard`, `PermissionGuard` + `usePermission` on the shared `PERMISSIONS`, `Header` (QUICKBITE · terminal code, live clock, who is signed in), `DefaultLayout`, `PinPad`, pages `/login` (PIN sign-in), `/pair` (kiosk / kitchen screen setup), `/home` (who / where / what you can do), 404.
- `@shared/utils` wired (package exports, Vite alias, tsconfig path); Vite proxies `/api` → `localhost:3000` (`VITE_API_URL=/api`, `.env.example`); `vite-env.d.ts`; deps `sileo`, `react-day-picker`.
- `.claude/launch.json` (`pos-web`).

**Checked:** web `tsc` + `vite build` · in the browser: signed-out → /login · wrong PIN → “Wrong username or PIN.” · cashier PIN at POS-01 → home with the cashier's permissions · reload keeps the session (`/auth/me`) · Log out · EXPO-01 paired with a device code → “Kitchen Display 01”, kitchen permissions only, no Log out.

---

### QB-004a — Menu API: kiosk menu in one call, sold out / back in

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/api/menu` (cut from QB-003's branch) |
| **Layer** | api + shared |
| **Status** | 🟠 In Review |

**What was built** (design §5.1 kiosk rules, §8.1, decision 19):
- `GET /api/kiosk/menu?lang=en|zh|ko` (`menu.view`): active categories → items → the extras each item offers; names in the kiosk language with English fallback; extras priced with `price_override` when set; sold-out items / extras kept and marked `available: false`; empty categories left out; kiosk settings (idle / reset seconds, online payment).
- `PATCH /api/menu-items/:id/availability` and `PATCH /api/addons/:id/availability` (`menu.availability` — cashier, manager, admin).
- Shared `menu.model.ts` (`KioskMenu`, `MenuCategory`, `MenuItem`, `MenuAddon`, `LANGUAGES`) and `kioskApi`, `menuItemApi`, `addonApi`.
- Tests: kiosk menu assembly (6), availability (4) — 36/36 in total.

**Checked live:** Korean menu (5 categories, translated names, ₱ prices), B5 extras, `lang=fr` → 400, cashier marks B4 sold out → kiosk sees it, chef → 403, back in, empty body → 400.

---

### QB-004b — Kiosk screens: start, menu, item + extras, cart

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/page/kiosk` (cut from QB-004a's branch) |
| **Layer** | web |
| **Status** | 🟠 In Review |

**What was built** (design §5.1, UI references 1–5):
- `/kiosk` (full-screen `KioskLayout`, permission `orders.create`); a paired kiosk opening `/home` is sent there.
- Start: IN (eat here · table service) / OUT (grab & go · packed bag), English / 中文 / 한국어.
- Menu: categories on the left, item cards (icon, name, price, + Add; sold out greyed), top bar (IN • Dine-In ⇄, EN / 中文 / 한국, cart count), Cancel (asks first when the cart has items) + View Cart (count, total).
- Item: qty − / +, extras to tick (sold-out ones disabled), “Add to Order ₱(price + extras) × qty”.
- Cart: “Name (+ extras)”, “₱each • ₱line”, qty − / + (0 removes), GCash / Cash / Card, Total order. **Proceed Order is wired in QB-005** (the button appears once placing orders exists).
- `pages/Kiosk/cart.ts`: picks only (item ID, qty, extra IDs) — same item + same extras merge into one line; prices read from the menu in centavos; lines that went sold out are flagged.
- `useIdleReset` (“Still there?” → start over), `useKioskMenu` (per language, refreshed every minute), kiosk text in en / zh / ko (`public/locales`).

**Checked in the browser (tablet 768×1024):** start screen · IN → menu · Fries ×3 = ₱195 · Spicy Burger ×3 + Crispy Fries (S) = ₱555 · Iced Cola Fizz ×2 + Crispy Fries (S) = ₱160 · cart = 8 items, ₱910 (same as the mock-up) · 中文 switches everything and keeps the cart · Cancel → confirm → fresh start in English.

---

### QB-004c — Backend by system: auth · kiosk · pos · kds joined by one pipeline

| Field | Value |
|---|---|
| **Type** | refactor |
| **Branch** | `refactor/forthvargas/api/system-modules` (cut from QB-004b's branch) |
| **Layer** | api + shared + web (imports) + docs |
| **Status** | 🟠 In Review |

**Why:** one backend area per screen (kiosk, cashier, kitchen) connected by one order pipeline — clearer ownership and far fewer files than one module per table.

**What changed** (no behaviour change except the URLs below):
- New `src/pipeline/menu.ts` — the menu read (names, prices, extras, sold-out) and sold out / back in, used by kiosk and pos.
- `modules/kiosk` (menu), new `modules/pos` (menu, sold out), `modules/auth` now also pairs screens; `modules/users`, `terminals`, `menu-items`, `addons` and `kiosk.repository` folded in and removed (25 → 14 API files).
- URLs: `PATCH /api/pos/menu-items/:id/availability`, `PATCH /api/pos/addons/:id/availability`, `GET /api/pos/menu` (new), `GET /api/auth/terminals`, `POST /api/auth/terminals/:id/pair`.
- `packages/shared/api`: `auth.ts`, `kiosk.ts`, `pos.ts` (+ barrel); web hook file `useKiosk.ts`.
- Tests regrouped: `auth.test.ts`, `pipeline-menu.test.ts`, `permissions.test.ts` — 29/29.
- CLAUDE.md, CODEBASE.md and the design doc's endpoint list updated.

**Checked live:** kiosk menu (ko), pos menu, pos sold out / back in (cashier 200, chef 403), auth terminals (admin 200, cashier 403), pair POS 400, old URLs 404.

---

### QB-005 — Placing orders: pricing, numbering, orders pipeline + kiosk Proceed Order

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/api/place-order` (cut from QB-004c's branch; `api/orders` is taken by an October branch) |
| **Layer** | api + shared + web |
| **Status** | 🟠 In Review |

**What was built** (design §5.8, §7.2–7.7):
- `pipeline/pricing.ts` — lines, extras, discounts (percent, fixed voucher, Senior / PWD with group share), VAT split, total due in centavos; tested on the design's worked examples (₱910, ₱306, ₱242.86, ₱315.71).
- `pipeline/numbering.ts` — `SELECT … FOR UPDATE` on `order_sequences` inside the order transaction → `ORD-000001`.
- `pipeline/orders.ts` — `placeOrder` (same client_ref → saved order; merge identical lines; 409 ITEM_UNAVAILABLE for sold-out / not-offered items and extras; 409 TOTAL_CHANGED; one transaction for number, order, lines, extras, first status event; duplicate-key race handled) and `getOrder`.
- `pipeline/status.ts` — `logEvent` into `order_status_events`.
- `POST /api/kiosk/orders` (paired kiosk only; saved as awaiting payment, 3-digit slip code) and `GET /api/kiosk/orders/:id`; the error handler now returns `details` (`{ code, … }`).
- Shared `order.model.ts` (`PlaceKioskOrderBody`, `OrderSummary`), `kioskApi.placeOrder / order`.
- Kiosk: Proceed Order (one client_ref per cart, `utils/uuid.ts` works on http LAN addresses), errors shown in the customer's language, Order Sent screen (number, “Please pay at the counter”, mode, payment, items, total, time, countdown).
- Tests: pricing (6), orders pipeline (9) — 44/44.

**Checked live:** mock-up cart → ORD-000001, ₱910, VAT ₱97.50, awaiting payment, names / extras saved, slip code; same tap → same order; total ₱900 → 409; fries sold out → 409; cashier on the kiosk endpoint → 403; qty 0 → 400; numbers not used by refused orders. In the browser as a paired KIOSK-01: OUT → Double Smash Burger → Cash → Proceed → “Order Sent! #000002 • Please pay at the counter” → countdown back to start.

---

### QB-006 — Kiosk order slip with barcode + cashier slip scan

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/api/slip-scan` (cut from QB-005's branch) |
| **Layer** | api + shared + web |
| **Status** | 🟠 In Review |

**What was built** (design §5.9, §5.10, §7.11, decision 21):
- `packages/shared/utils/slip-code.ts` — `slipCode` (store + order number + slip code + Luhn check digit → `010007485278`), `formatSlipCode`, `parseSlipCode`; order summaries now carry `slip_code`.
- `pipeline/status.ts` — `ALLOWED` moves (§4.4) and `moveStatus` (only while still `from`, stamps, clears the lock, logs).
- `GET /api/pos/scan/:code` — ready (locked to this register) / already paid / expired (cancelled by the system after 30 min) / voided / in use at another register; `POST /api/pos/orders/:id/release`; `POST /api/kiosk/orders/:id/slip-printed`.
- Kiosk: the 80 mm order slip prints by itself on Order Sent (browser print, Code 128 via `jsbarcode`; Chrome `--kiosk-printing` skips the dialog), Reprint slip, barcode also on screen.
- Register (`/register`, linked from home): `useScannerInput` (12 digits + Enter in < 50 ms gaps, anywhere on the page), typed codes with dashes, check digit checked before asking the server, receipt panel, lock time, CLEAR, notices for paid / expired / voided / another register.
- Tests: slip code, scan outcomes, status moves — 57/57.

**Checked live:** ORD-000003 → slip code 010000038603, slip printed recorded, scan → ready on POS-01, typed with dashes, wrong check digit → 400, manager without a register → 400, kiosk → 403, 40-minute-old order → expired + cancelled (system event), release. In the browser: simulated scanner burst → order on the receipt panel; wrong digit → message; expired order notice; slip rendered (matches the design sample).

---

### QB-007a — Register API: shifts, discounts, walk-in orders, settle kiosk orders

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Branch** | `addFeature/forthvargas/api/register` (cut from QB-006's branch) |
| **Layer** | api + shared |
| **Status** | 🟠 In Review |

**What was built** (design §5.3–5.4, §5.7, §7.4–7.6, decisions 11–12, 17, 23):
- `pipeline/discounts.ts` (Student %, Senior / PWD with ID + name + group share, vouchers with dates / uses / min spend), `pipeline/payments.ts` (cash ≥ total → change; GCash / card reference), `pipeline/orders.ts` — paid walk-in orders, `settleOrder`, order summaries with discount + payment.
- `modules/pos`: shifts (current, open), discount types, voucher check, next number, Kiosk # list, walk-in order, settle, cancel (README lists them).
- Shared `pos.model.ts` (`OpenShiftBody`, `DiscountInput`, `PaymentInput`, `PosOrderBody`, `SettleBody`, `KioskQueueItem`, …).
- Tests: discounts (7), payments (3), walk-in (4), settle (3) — 74/74.

**Checked live:** no shift → 409; open ₱2,000; open again → 409; design example B (Student, ₱340 → ₱306, cash ₱500 → change ₱194, VAT ₱32.79) and C (Senior → ₱242.86, VAT removed ₱36.43, GCash ref) on the real DB; Senior without ID → 400; cash short → 422; kiosk ₱910 order in the Kiosk # list → scanned → settled cash ₱1,000 (change ₱90) → preparing; settle again → 409; scan again → already paid; unpaid kiosk order cancelled.

---

## 📋 Planned (in build order)

| Ticket | What | Branch |
|---|---|---|
| QB-005 | Orders API: pricing engine (shared, tested on the design's worked examples), discounts, order number, `POST /orders` | `addFeature/forthvargas/api/orders` |
| QB-007 | Cashier Register: shifts, ticket, discounts, tender, settle scanned orders, receipt | `addFeature/forthvargas/page/register` |
| QB-008 | Live feed (WebSocket) + Kitchen Display (complete / recall / clear served) | `addFeature/forthvargas/page/kitchen-display` |
| QB-009 | Reports: shift sales, tender reconciliation, audit log, close shift → Z-reading, CSV export | `addFeature/forthvargas/page/reports` |
| QB-010 | Admin: menu / extras / translations, users, discounts, vouchers, terminals, settings | `addFeature/forthvargas/page/admin` |

---

## ✅ Done

_None yet._
