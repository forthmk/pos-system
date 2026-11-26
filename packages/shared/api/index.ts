/* ──────────────────────────────────────────────────────────────────────────
 * The web app's API calls, one file per backend area — the same split as
 * apps/api/src/modules/* and apps/web/src/hooks/api/*:
 *
 *   auth.ts   authApi    who is using the system: staff PIN, paired screens
 *   kiosk.ts  kioskApi   the self-service kiosk
 *   pos.ts    posApi     the cashier register
 *   kds.ts    kdsApi     the kitchen display + Orders board
 *   admin.ts  adminApi   store setup: menu, discounts, vouchers, staff, screens, settings
 *
 *   import { kioskApi } from '@shared/api';
 * ────────────────────────────────────────────────────────────────────────── */
export * from './auth';
export * from './kiosk';
export * from './pos';
export * from './kds';
export * from './admin';
