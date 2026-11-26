import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';

/* ──────────────────────────────────────────────────────────────────────────
 * Shift Sales & Z-Reading (design §5.7, §7.9, decisions 14–16 and 18; UI
 * reference "Sales Analytics & Shift Z-Reading Reports").
 *
 * Money is in pesos (2 decimals). "Sales" = orders paid in the shift and not
 * voided. The headline (gross_sales) is the money collected after discounts
 * — it equals the tender reconciliation total (decision 18).
 * ────────────────────────────────────────────────────────────────────────── */

export const CloseShiftBodySchema = StrictObject({
    /** Cash counted in the drawer at the end of the shift. */
    counted_cash: Type.Number({ minimum: 0, maximum: 10_000_000 }),
});
export type CloseShiftBody = Static<typeof CloseShiftBodySchema>;

/** Void + refund a paid order: a manager approves with their username and PIN (decision 16). */
export const VoidOrderBodySchema = StrictObject({
    manager_username: Type.String({ minLength: 1, maxLength: 60 }),
    manager_pin: Type.String({ minLength: 4, maxLength: 64 }),
    reason: Type.String({ minLength: 3, maxLength: 255 }),
});
export type VoidOrderBody = Static<typeof VoidOrderBodySchema>;

export interface ShiftInfo {
    id: number;
    terminal_code: string;
    cashier_name: string;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at: string | null;
    opening_cash: number;
}

export interface TenderLine {
    method: 'gcash' | 'cash' | 'card';
    total: number;
    /** Whole percent of all tenders. */
    share_pct: number;
}

/** One row of the Transaction Audit Log. */
export interface AuditRow {
    order_id: number;
    order_no: string;
    source: 'kiosk' | 'pos';
    dining_mode: 'IN' | 'OUT';
    /** "3x Double Smash Burger, 2x Sundae" */
    items: string;
    method: 'gcash' | 'cash' | 'card' | null;
    total: number;
    status: 'preparing' | 'completed' | 'voided';
    paid_at: string;
}

export interface ZReadingInfo {
    id: number;
    z_number: number;
    generated_at: string;
    generated_by: string;
    grand_total_start: number;
    grand_total_end: number;
}

export interface ShiftReport {
    shift: ShiftInfo;
    /** Headline: Σ total due of paid, not-voided orders. */
    gross_sales: number;
    /** Store sales today until now vs yesterday until the same time; null when yesterday had none. */
    vs_yesterday_pct: number | null;
    transactions: number;
    in_count: number;
    out_count: number;
    items_sold: number;
    average_ticket: number;
    items_per_order: number;
    tenders: TenderLine[];
    /** Sales before discounts and VAT exemptions (Z-reading). */
    subtotal: number;
    /** subtotal − gross_sales: discounts + VAT removed for Senior / PWD. */
    discount_total: number;
    vatable_sales: number;
    vat_amount: number;
    vat_exempt_sales: number;
    voids: { count: number; amount: number };
    refunds_amount: number;
    first_order_no: string | null;
    last_order_no: string | null;
    cash: {
        opening: number;
        /** Cash taken in this shift (including orders later refunded). */
        sales: number;
        refunds: number;
        /** opening + sales − refunds */
        expected: number;
        counted: number | null;
        over_short: number | null;
    };
    audit: AuditRow[];
    z_reading: ZReadingInfo | null;
    server_time: string;
}

/** A row of the shift picker (past Z-readings). */
export interface ShiftListItem {
    id: number;
    terminal_code: string;
    cashier_name: string;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at: string | null;
    z_number: number | null;
    net_sales: number | null;
}
