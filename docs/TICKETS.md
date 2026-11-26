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

## 📋 Planned (in build order)

| Ticket | What | Branch |
|---|---|---|
| QB-004b | Kiosk screens: start (IN / OUT, language), menu, item + extras, cart | `addFeature/forthvargas/page/kiosk` |
| QB-005 | Orders API: pricing engine (shared, tested on the design's worked examples), discounts, order number, `POST /orders` | `addFeature/forthvargas/api/orders` |
| QB-006 | Kiosk order slip + barcode (thermal-printer `barcode` block), `GET /pos/scan/:code`, `useScannerInput` | `addFeature/forthvargas/api/slip-scan` |
| QB-007 | Cashier Register: shifts, ticket, discounts, tender, settle scanned orders, receipt | `addFeature/forthvargas/page/register` |
| QB-008 | Live feed (WebSocket) + Kitchen Display (complete / recall / clear served) | `addFeature/forthvargas/page/kitchen-display` |
| QB-009 | Reports: shift sales, tender reconciliation, audit log, close shift → Z-reading, CSV export | `addFeature/forthvargas/page/reports` |
| QB-010 | Admin: menu / extras / translations, users, discounts, vouchers, terminals, settings | `addFeature/forthvargas/page/admin` |

---

## ✅ Done

_None yet._
