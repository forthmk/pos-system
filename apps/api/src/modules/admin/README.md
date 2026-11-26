# modules/admin — store setup

Design §8.1 `/api/admin/*`. The editing side of everything the screens read: the menu (with Chinese / Korean names), extras, discount buttons, vouchers, staff, screens and store settings. Screens: `apps/web/src/pages/Admin/` (QB-010b). Client: `packages/shared/api/admin.ts`.

**Rules**
- **Nothing is deleted.** Rows are switched off (`is_active: false`); past orders, receipts and Z-readings keep pointing at real rows (order lines also keep their own name / price copy).
- Every id must belong to the admin's store (else 404). Duplicate SKU / code / username / voucher → 409 `DUPLICATE` with a plain message.
- Menu changes publish `menu.changed`, settings `settings.changed` (`pipeline/live.ts`), so kiosks / registers / kitchen screens refresh without a reload.

| Area | Method · Path | Permission | Notes |
|---|---|---|---|
| Menu | GET `/menu` | `menu.edit` (admin) | categories → items (extras + price override, translations), extras, kitchen stations — switched-off rows included |
| | POST `/categories` · PUT `/categories/:id` | `menu.edit` | code (A–Z, 0–9), name, sort, on / off, kitchen station, `translations {zh, ko}` |
| | POST `/items` · PUT `/items/:id` | `menu.edit` | category, SKU (upper-cased, unique), name, description, price, bestseller, combo, sort, on / off, `addons` (replaces the list, in order), translations |
| | POST `/addons` · PUT `/addons/:id` | `menu.edit` | name, price, on / off, translations |
| Discounts | GET `/discount-types` · PUT `/discount-types/:id` | `settings.manage` (admin) | name, sort, on / off; rate only for percent kinds (Student). Senior / PWD 20% is law → 400 |
| Vouchers | GET · POST `/vouchers` · PUT `/vouchers/:id` | `vouchers.manage` (managers) | code (upper-cased), percent 1–100 or fixed ₱, min spend, valid from / to, max uses, on / off |
| Staff | GET · POST `/users` · PUT `/users/:id` | `users.manage` (admin) | username (lower-case, unique), name, role, PIN 4–8 digits (bcrypt). 409 `LAST_ADMIN` (keep one active admin), 409 `SELF` (can't switch yourself off) |
| Screens | GET · POST `/terminals` · PUT `/terminals/:id` | `terminals.manage` (admin) | code, type (kiosk / pos / kds, fixed), name, kitchen station (kds only), on / off |
| | POST `/terminals/:id/unpair` | `terminals.manage` | a lost tablet's device token stops working at once; pair the new one with `POST /api/auth/terminals/:id/pair` |
| | GET · POST `/stations` · PUT `/stations/:id` | `terminals.manage` | kitchen stations (EXPO-01, DRINKS-01 …) |
| Settings | GET · PUT `/settings` | `settings.manage` | the keys in `SETTINGS_SPEC` (shared `admin.model.ts`) with min / max; VAT 12%, Senior / PWD 20% and kiosk online payment (off in v1) are shown, not editable |

Files: `admin.routes` · `admin.controller` (thin) · `admin.service` (rules) · `admin.repository` (queries, translation upsert) · `admin.schema`. Tests: `src/test/admin.test.ts`.
