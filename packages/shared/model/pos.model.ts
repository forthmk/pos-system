import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { DINING_MODES, OrderLineInputSchema, PAYMENT_METHODS, type DiningMode } from './order.model';

/* ──────────────────────────────────────────────────────────────────────────
 * The cashier register (design §5.3–5.4, §5.7, §7.4–7.6).
 * ────────────────────────────────────────────────────────────────────────── */

const uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' });

/* ── shifts ────────────────────────────────────────────────────────────── */

export const OpenShiftBodySchema = StrictObject({ opening_cash: Type.Number({ minimum: 0, maximum: 1_000_000 }) });
export type OpenShiftBody = Static<typeof OpenShiftBodySchema>;

export interface ShiftSummary {
    id: number;
    terminal_code: string;
    cashier_name: string;
    opened_at: string;
    opening_cash: number;
    status: 'open' | 'closed';
}

/* ── discounts ─────────────────────────────────────────────────────────── */

/** One discount per order (design decision 12). `type` = discount_types.code. */
export const DiscountInputSchema = StrictObject({
    type: Type.String({ minLength: 1, maxLength: 20 }), // REGULAR · STUDENT · SENIOR · PWD · VOUCHER
    id_number: Type.Optional(Type.String({ maxLength: 40 })),
    holder_name: Type.Optional(Type.String({ maxLength: 120 })),
    diners: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    qualified: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    code: Type.Optional(Type.String({ maxLength: 40 })),
});
export type DiscountInput = Static<typeof DiscountInputSchema>;

export interface DiscountType {
    id: number;
    code: string;
    name: string;
    kind: 'none' | 'percent' | 'senior_pwd' | 'voucher';
    rate: number;
    requires_id: boolean;
}

export const VoucherCheckBodySchema = StrictObject({ code: Type.String({ minLength: 1, maxLength: 40 }), subtotal: Type.Number({ minimum: 0 }) });
export type VoucherCheckBody = Static<typeof VoucherCheckBodySchema>;
export interface VoucherCheck {
    code: string;
    kind: 'percent' | 'fixed';
    value: number;
    /** The discount it gives on `subtotal`. */
    amount: number;
}

/* ── payment ───────────────────────────────────────────────────────────── */

export const PaymentInputSchema = StrictObject({
    method: Type.Union(PAYMENT_METHODS.map((m) => Type.Literal(m))),
    /** Cash received (cash only). */
    tendered: Type.Optional(Type.Number({ minimum: 0, maximum: 1_000_000 })),
    /** GCash / card reference typed by the cashier (design decision 17). */
    reference_no: Type.Optional(Type.String({ maxLength: 60 })),
});
export type PaymentInput = Static<typeof PaymentInputSchema>;

/* ── orders ────────────────────────────────────────────────────────────── */

/** A walk-in order rung up and paid at the register (design §7.4). */
export const PosOrderBodySchema = StrictObject({
    client_ref: uuid,
    dining_mode: Type.Union(DINING_MODES.map((m) => Type.Literal(m))),
    lines: Type.Array(OrderLineInputSchema, { minItems: 1, maxItems: 50 }),
    discount: Type.Optional(DiscountInputSchema),
    payment: PaymentInputSchema,
});
export type PosOrderBody = Static<typeof PosOrderBodySchema>;

/**
 * Taking payment for a scanned kiosk order (design §5.10, decision 23):
 * optionally a discount, and `lines` when the cashier changed the order with
 * the customer (re-priced from today's menu; otherwise the kiosk prices stay).
 */
export const SettleBodySchema = StrictObject({
    discount: Type.Optional(DiscountInputSchema),
    payment: PaymentInputSchema,
    lines: Type.Optional(Type.Array(OrderLineInputSchema, { minItems: 1, maxItems: 50 })),
});
export type SettleBody = Static<typeof SettleBodySchema>;

/** The Kiosk # list: kiosk orders waiting for payment (design §5.4). */
export interface KioskQueueItem {
    id: number;
    order_no: string;
    display_no: string;
    placed_at: string;
    dining_mode: DiningMode;
    item_count: number;
    total_due: number;
    slip_code: string | null;
    locked_by: string | null;
}
