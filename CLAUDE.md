# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

`pos-system` is a pnpm-workspace monorepo orchestrated by Turborepo, with two deployable apps and one internal package:

- **`apps/api`** — Fastify backend (TypeScript), MySQL via Kysely, JWT auth with a role/permission system.
- **`apps/web`** — React 19 + Vite frontend (TypeScript), Tailwind CSS v4, Redux Toolkit, TanStack Query.
- **`packages/shared`** — TypeBox schemas/types and an Axios client factory shared by both apps.

Each app has its own detailed `README.md` ([apps/api/README.md](apps/api/README.md), [apps/web/README.md](apps/web/README.md), [packages/shared/README.md](packages/shared/README.md)) — read those for structure diagrams and per-package conventions; this file covers cross-cutting/commands info only.

---

## ⚡ Core AI rules (read before writing any code)

### 1 — Server-first data fetching (no client-side data state)
All feature data must live on the **server**. The frontend never owns data — it only queries it.

- Every piece of feature data is fetched via **TanStack Query** (`useQuery` / `useMutation`) calling the API.
- **Never** use `useState` + `useEffect` to fetch or store server data.
- **Never** use Redux for server data — Redux is only for UI/theme config (`themeConfigSlice`).
- Derived UI state (loading, error, empty) comes from TanStack Query's `isLoading`, `isError`, `data` — not local state mirrors.
- Filtering, sorting, and pagination are **query parameters sent to the API**, not client-side array operations on a full dataset.
- Mutations (`POST`/`PUT`/`DELETE`) use `useMutation` and call `queryClient.invalidateQueries` on success to keep the cache fresh.

### 2 — Backend first, frontend second
Build in this order for every feature:
1. DB migration (if schema changes)
2. API module (routes → controller → service → repository → schema)
3. Shared TypeBox model + API client definition in `packages/shared`
4. Frontend TanStack Query hook in `src/hooks/api/use<Module>.ts`
5. UI page/component consuming the hook

Never start the frontend layer until the API endpoint is confirmed working.

### 3 — One branch per ticket
Every feature, refactor, or fix must be on its own branch. See **Branch & ticket workflow** below. Never commit multiple unrelated tickets on the same branch.

### 4 — Notify on collateral changes
If implementing a ticket requires touching code that is **not directly related** to the ticket (e.g. a shared utility, a base component, another module's types), **stop and tell the developer** before making that change. Do not silently edit unrelated files. The developer decides whether it belongs in this ticket or a separate one.

### 5 — No unused code
Do not leave commented-out code, dead imports, or placeholder `TODO` blocks in committed files. If something is not ready, omit it and note it in the PR description.

---

## Branch & ticket workflow

### Branch naming convention

```
addFeature/<author>/<componentType>/<whatWeAdd>
refactor/<author>/<componentType>/<whatWeRefactor>
fixed/<author>/<componentType>/<whatWeFixed>
```

- `<author>` — your GitHub handle, e.g. `forthvargas`
- `<componentType>` — the layer or UI type, e.g. `api`, `modal`, `page`, `hook`, `migration`, `component`
- `<whatWeAdd>` — short kebab-case description, e.g. `product-list-endpoint`, `login-form`, `sales-datatable`

**Examples:**
```
addFeature/forthvargas/api/product-crud
addFeature/forthvargas/page/product-list
addFeature/forthvargas/modal/create-product-form
refactor/forthvargas/hook/use-products-query
fixed/forthvargas/api/auth-token-expiry
```

### Daily PR limit
- Maximum **2 branch PRs per day** merged into `development`.
- Each PR must have a matching ticket (see `docs/TICKETS.md`).

### Creating a branch
Always branch from `development`:
```bash
git checkout development
git pull origin development
git checkout -b addFeature/forthvargas/api/your-feature
```

### Merging
- Feature branch → `development` (PR, reviewed)
- `development` → `master` (PR, production release only)
- Never push directly to `master` or `development`.

---

## Commands

Run from the repo root unless noted.

```bash
pnpm install                              # install all workspace deps
pnpm build                                # build shared -> api -> web, in dependency order (turbo)
pnpm dev                                  # dev mode for apps/* (turbo, respects ^build)
pnpm dev:api                              # dev only the api package
pnpm --filter @pos-system/web dev         # dev only the web package (port 5173)
pnpm start                                # run compiled production servers
pnpm test                                 # runs apps/api tests only (pnpm --filter api test)
pnpm db:migrate / db:rollback / db:seed   # forwarded to apps/api
```

Per-package (from root, via `pnpm --filter <name> <script>`):

```bash
pnpm --filter @pos-system/api dev         # tsx watch, hot reload, piped through pino-pretty
pnpm --filter @pos-system/api build       # tsc -> dist/
pnpm --filter @pos-system/api test        # node --import tsx --test "src/test/**/*.test.ts"
pnpm --filter @pos-system/api db:gen      # regenerate Kysely types from the live DB (kysely-codegen)
pnpm --filter @pos-system/api db:migrate  # run pending migrations
pnpm --filter @pos-system/api db:rollback # roll back the last migration
pnpm --filter @pos-system/shared build    # compile shared/ -> dist/
turbo build --filter=@pos-system/api      # build only api (shared auto-built first via ^build)
```

There is no root-level lint/typecheck script; typechecking happens via each package's `build` (`tsc`).

---

## Cross-package dependencies

Packages reference each other via `workspace:*` (e.g. `"@pos-system/shared": "workspace:*"`). `apps/api` consumes `packages/shared`'s **compiled** `dist/` — rebuild `shared` after editing it or `api` won't see the change. `apps/web` reads `packages/shared` **source `.ts` files directly** via Vite path aliases (`@shared/model`, `@shared/axios`, `@shared/api`) — no build step needed for web to pick up shared changes.

When adding a new shared subpath (e.g. a new `utils/` category), it must be wired in three places: `packages/shared/package.json` `exports`, `apps/web/vite.config.ts` alias, and `apps/web/tsconfig.json` path.

---

## API architecture (`apps/api`)

Fastify app assembled in `src/app.ts`. Each domain lives under `src/modules/<name>/` as a strict 5-layer stack:

```
<name>.routes.ts       # endpoint definitions, preHandler auth wiring
<name>.controller.ts   # extracts params/body, calls service, sends reply
<name>.service.ts      # business logic, validation, error handling
<name>.repository.ts   # raw Kysely queries
<name>.schema.ts       # TypeBox request/response validation schemas
```

New modules are added by copying an existing small module and registering the route name in the `routes` array in `src/app.ts` — the array entry both mounts `modules/<name>/<name>.routes.js` at `/api/<name>` and is the sole registry of active modules.

**Auth/RBAC**: `fastify.authenticate` (verifies the JWT only) gates most routes. Fine-grained authorization goes through `fastify.checkPermission(module, action?)` (decorated in `src/middleware/authentication.ts`), which reads a permissions map embedded in the JWT at login — no DB round-trip per request.

```ts
preHandler: [fastify.authenticate!, fastify.checkPermission!('products', 'create')],
```

`fastify.checkRoles(allowedRoles[])` is a coarser role-based alternative also available.

In `NODE_ENV=dev`, `app.ts`'s preHandler hook auto-injects a fake admin JWT and `x-api-key` header when absent — routes exercised without an explicit token will silently authenticate as `admin` in dev.

Errors are raised as `ApiError` (`src/apiError.ts`) with a `statusCode`; tests assert on `err.statusCode`.

BigInt-safe JSON responses go through `src/utils/sendResult.ts` (MySQL can return BigInt for certain numeric columns).

File uploads: `src/utils/fileProcessor.ts` (multipart parsing + sharp image processing) → `src/utils/upload.ts` → Cloudflare R2 via `src/utils/r2Client.ts` (S3-compatible).

**Testing**: Node's native `node:test`/`node:assert`, not Jest/Vitest. `src/test/test-utils.ts#mockModule` mocks a sibling module's exports for service-layer unit tests.

**DB**: MySQL2 pool + Kysely (`src/services/database.service.ts`). Generated types live in `src/config/database/types.gen.ts` (regenerate with `db:gen`, don't hand-edit). Migrations are timestamp-prefixed files in `src/migrations/`; write new ones following the naming convention (`YYYYMMDD[_letter]_description.ts`).

---

## Web architecture (`apps/web`)

- **Routing**: `src/router/routes.tsx` (lazy-loaded pages) wrapped with layouts in `src/router/index.tsx`. `DefaultLayout` (sidebar+header) vs `BlankLayout` (login/404).
- **State**: Redux Toolkit only for theme/UI config (`store/themeConfigSlice.tsx`); auth is React Context + useReducer (`providers/AuthProvider.tsx`, guarded by `providers/AuthGuard.tsx`); server data is **always TanStack Query** — never useState.
- **API layer**: `src/services/api.ts` wraps `@shared/axios` (base URL from `VITE_API_URL`, JWT auto-attached from localStorage). Endpoint definitions live in `packages/shared/api/`; per-module TanStack Query hooks live in `src/hooks/api/use<Module>.ts`.
- **Forms**: react-hook-form + zod resolvers; feature form modals live in `src/components/modals/`.
- **UI kit**: `@pikoloo/darwin-ui` for toasts/shared UI, FontAwesome + lucide-react for icons, Tailwind CSS (v4, `@tailwindcss/vite` plugin) for styling.
- **i18n**: i18next with browser language detection; translation files in `public/locales/`.

Adding a page: create the component under `src/pages/<Section>/<Page>.tsx`, add a lazy route in `src/router/routes.tsx`.

---

## Code reference

The `commissary` repo (`/Users/enri/Documents/GitHub/commissary`) is a sister project on the same stack. Use it as a **read-only reference** for patterns — hooks, modals, datatables, RBAC wiring, API module structure. **Never modify commissary files when working in pos-system.**

---

## Environment

Each app has its own `.env` (gitignored) — copy from `.env.example`. API needs MySQL creds, JWT signing key, and R2 (Cloudflare) credentials; web needs `VITE_API_URL`. Loaded via dotenv (api) / Vite (web) automatically.
