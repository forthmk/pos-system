# POS System — Tickets & Branch Log

This file tracks all development tickets. Every branch must have a ticket entry here before any code is written.

---

## How to create a ticket

1. Add a new entry under the correct status section below.
2. Fill in all fields — **Branch name is mandatory** and must follow the naming convention.
3. Cut the branch from `development`:
   ```bash
   git checkout development
   git pull origin development
   git checkout -b <branch-name>
   ```
4. When the branch is ready for PR, move the ticket to **In Review**.
5. After merge, move it to **Done**.

---

## Branch naming convention

```
addFeature/<author>/<componentType>/<whatWeAdd>
refactor/<author>/<componentType>/<whatWeRefactor>
fixed/<author>/<componentType>/<whatWeFixed>
```

| Prefix | When to use |
|---|---|
| `addFeature:` | Adding a new endpoint, page, component, or hook |
| `refactor:` | Restructuring existing code without changing behaviour |
| `fixed:` | Fixing a bug or broken behaviour |

**Component types:** `api` · `page` · `modal` · `component` · `hook` · `migration` · `shared`

### Examples
```
addFeature/forthvargas/api/product-crud
addFeature/forthvargas/page/product-list
addFeature/forthvargas/modal/create-product-form
refactor/forthvargas/hook/use-products-query
fixed/forthvargas/api/auth-token-expiry
```

---

## Daily PR limit
- Max **2 PRs merged per day** into `development`.
- PRs are raised by the developer; AI prepares the branch and commits.

---

## Build order per ticket
For every addFeature ticket, always build in this order:
1. DB migration (if schema changes)
2. API module (routes → controller → service → repository → schema)
3. Shared model + API client (`packages/shared`)
4. TanStack Query hook (`apps/web/src/hooks/api/`)
5. UI page / modal / component

---

## Tickets

### 🔵 To Do

---

### TICKET-002 — Auth module (login + JWT)

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/api/auth-login-jwt` |
| **Layer** | api + shared |
| **Status** | To Do |
| **PR** | — |

**Description:**
POST `/api/auth/login` — validates username/password, returns signed JWT with role + permissions embedded.

**Acceptance criteria:**
- [ ] Returns `{ token, user }` on valid credentials
- [ ] Returns 401 on bad credentials
- [ ] JWT contains `user_id`, `role`, `name`
- [ ] Password verified with bcrypt

**Files expected to change:**
- `apps/api/src/modules/auth/`
- `packages/shared/api/auth.ts`

---

### TICKET-003 — Categories CRUD API

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/api/categories-crud` |
| **Layer** | api + shared |
| **Status** | To Do |
| **PR** | — |

**Description:**
GET / POST / PUT / DELETE for menu categories.

**Acceptance criteria:**
- [ ] GET `/api/categories` returns list
- [ ] POST `/api/categories` creates a category (admin only)
- [ ] PUT `/api/categories/:id` updates
- [ ] DELETE `/api/categories/:id` deletes

---

### TICKET-004 — Menu Items CRUD API

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/api/menu-items-crud` |
| **Layer** | api + shared |
| **Status** | To Do |
| **PR** | — |

**Description:**
Full CRUD for menu items with category filter and availability toggle.

**Acceptance criteria:**
- [ ] GET `/api/menu-items` with optional `?category_id=` filter
- [ ] POST, PUT, DELETE (admin only)
- [ ] PATCH `/api/menu-items/:id/availability` toggle is_available

---

### TICKET-005 — Tables CRUD API

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/api/tables-crud` |
| **Layer** | api + shared |
| **Status** | To Do |
| **PR** | — |

**Description:**
Manage restaurant tables (table_number, capacity, status available/occupied).

---

### TICKET-006 — Orders API (create + update status)

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/api/orders-crud` |
| **Layer** | api + shared |
| **Status** | To Do |
| **PR** | — |

**Description:**
Create order with items, update order status (new → preparing → ready → completed), list orders.

---

### TICKET-007 — Payments API

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/api/payments` |
| **Layer** | api + shared |
| **Status** | To Do |
| **PR** | — |

**Description:**
Record payment for a completed order (cash/card/online), return change amount for cash payments.

---

### 🟡 In Progress

---

### TICKET-001 — API infrastructure + initial DB schema migration

| Field | Value |
|---|---|
| **Type** | addFeature |
| **Author** | forthvargas |
| **Branch** | `addFeature/forthvargas/migration/initial-schema` |
| **Layer** | api |
| **Status** | In Progress |
| **PR** | — |

**Description:**
Set up the full Fastify API skeleton (app.ts, index.ts, database service, apiError, sendResult util, migration runner) and write all 9 table migrations from the ERD: `users`, `tables`, `categories`, `menu_items`, `orders`, `order_items`, `payments`, `inventory`, `order_status_log`.

**Acceptance criteria:**
- [ ] `pnpm --filter @pos-system/api db:migrate` runs without error
- [ ] All 9 tables created in MySQL
- [ ] `pnpm --filter @pos-system/api dev` starts with no TypeScript errors
- [ ] GET `/health` returns `{ status: "ok" }`

**Files expected to change:**
- `apps/api/src/app.ts`
- `apps/api/src/index.ts`
- `apps/api/src/apiError.ts`
- `apps/api/src/services/database.service.ts`
- `apps/api/src/utils/sendResult.ts`
- `apps/api/src/migrations/migrate.ts`
- `apps/api/src/migrations/migrate-down.ts`
- `apps/api/src/migrations/20261008_a_initial_schema.ts`
- `apps/api/src/types/database.types.ts`
- `apps/api/.env.example`

---

### 🟠 In Review (PR open)

<!-- Tickets with an open PR on GitHub -->

---

### ✅ Done

<!-- Merged tickets -->

---

## Ticket template

Copy this block for each new ticket:

```
### TICKET-XXX — <short title>

| Field | Value |
|---|---|
| **Type** | addFeature / refactor / fixed |
| **Author** | forthvargas |
| **Branch** | addFeature/forthvargas/api/example |
| **Layer** | api / web / shared / both |
| **Status** | To Do |
| **PR** | — |

**Description:**
What this ticket does and why.

**Acceptance criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Files expected to change:**
- `apps/api/src/modules/<name>/`
- `packages/shared/api/<name>.ts`
- `apps/web/src/hooks/api/use<Name>.ts`
- `apps/web/src/pages/<Section>/<Page>.tsx`

**Notes / collateral risk:**
List any shared files that might be affected. If unsure, flag to developer before touching.
```
