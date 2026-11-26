import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { LANGUAGES } from './menu.model';

// Placing an order (design §7.2): the screen sends what was picked — IDs and
// quantities — never prices. `expected_total` is only compared with the
// server's total to warn the customer if a price changed while ordering.

export const DINING_MODES = ['IN', 'OUT'] as const;
export const PAYMENT_METHODS = ['gcash', 'cash', 'card'] as const;
export type DiningMode = (typeof DINING_MODES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const OrderLineInputSchema = StrictObject({
    menu_item_id: Type.Integer({ minimum: 1 }),
    quantity: Type.Integer({ minimum: 1, maximum: 99 }),
    addon_ids: Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 20, uniqueItems: true }),
});
export type OrderLineInput = Static<typeof OrderLineInputSchema>;

export const PlaceKioskOrderBodySchema = StrictObject({
    /** UUID made by the screen; a retry with the same one returns the saved order. */
    client_ref: Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }),
    dining_mode: Type.Union(DINING_MODES.map((m) => Type.Literal(m))),
    language: Type.Optional(Type.Union(LANGUAGES.map((l) => Type.Literal(l)))),
    payment_method: Type.Union(PAYMENT_METHODS.map((m) => Type.Literal(m))),
    expected_total: Type.Number({ minimum: 0 }),
    lines: Type.Array(OrderLineInputSchema, { minItems: 1, maxItems: 50 }),
});
export type PlaceKioskOrderBody = Static<typeof PlaceKioskOrderBodySchema>;

export type OrderStatus = 'awaiting_payment' | 'preparing' | 'completed' | 'cancelled' | 'voided';

/** What the API returns for an order (design §7.3). Names are the English snapshots. */
export interface OrderSummary {
    id: number;
    order_no: string;
    display_no: string;
    status: OrderStatus;
    source: 'kiosk' | 'pos';
    dining_mode: DiningMode;
    payment_method: PaymentMethod;
    language: (typeof LANGUAGES)[number];
    item_count: number;
    subtotal: number;
    discount_total: number;
    vatable_sales: number;
    vat_amount: number;
    vat_exempt_sales: number;
    total_due: number;
    placed_at: string;
    /** Kiosk orders: the 12-digit slip barcode (design §7.11), else null. */
    slip_code: string | null;
    lines: { sku: string; name: string; quantity: number; unit_price: number; addons: { name: string; price: number }[]; line_total: number }[];
}

/** GET /api/pos/scan/:code (design §7.11). */
export type ScanResult =
    | { result: 'ready'; order: OrderSummary; locked_until: string }
    | { result: 'already_paid'; order_no: string; status: OrderStatus }
    | { result: 'expired'; order: OrderSummary }
    | { result: 'voided'; order_no: string }
    | { result: 'in_use'; order_no: string; terminal: string };
