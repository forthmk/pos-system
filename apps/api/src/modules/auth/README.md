# modules/auth — who is using the system

Staff sign in with a PIN; kiosk and kitchen screens are paired once and sign themselves in. Every guarded request re-reads the caller from the DB (`resolvePrincipal`), so switching a user off or re-pairing a screen takes effect at once. Roles: `PERMISSIONS` in `packages/shared/utils/permissions.ts` (design §2.2).

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/api/auth/pin-login` | anyone | username + PIN (+ terminal code) → 12 h staff token. Staff can't sign in on the kiosk. 5 wrong PINs lock the username for 5 min. |
| POST | `/api/auth/device` | a paired screen | device token → 30 d device token |
| GET | `/api/auth/me` | signed in | who am I now + a fresh token |
| GET | `/api/auth/terminals` | admin (`terminals.manage`) | the store's registers / kiosks / kitchen screens (no token hashes) |
| POST | `/api/auth/terminals/:id/pair` | admin | new device token for a kiosk / KDS, shown once; only its SHA-256 is stored. Pairing again cuts off the old screen. |

Files: `auth.routes` · `auth.controller` · `auth.service` (login, pair, deviceLogin, resolvePrincipal) · `auth.repository` (users + terminals queries) · `auth.schema`. Guards: `src/middleware/authentication.ts`. Tests: `src/test/auth.test.ts`.
