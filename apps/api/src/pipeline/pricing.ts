// Pipeline · pricing — the money maths lives in @pos-system/shared
// (packages/shared/utils/pricing.ts) so the register's on-screen preview and
// the API use the same code (design §7.6). The pipeline imports it from here.
export { priceOrder, toCents, VAT_RATE, type Discount, type PricedLine, type PricedOrder, type PricingLine } from '@pos-system/shared';
