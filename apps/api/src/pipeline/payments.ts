import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { PaymentInput } from '@pos-system/shared';
import ApiError from '../apiError';
import type { DB } from '../config/database/types.gen';
import { toCents } from './pricing';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · payments — the money received for an order (design §7.5, §7.6,
 * decision 17).
 *
 *   cash          tendered ≥ total due (else 422 INSUFFICIENT_CASH);
 *                 change = tendered − total due
 *   gcash / card  reference no. typed by the cashier: 6–30 letters, numbers,
 *                 spaces or dashes
 * ────────────────────────────────────────────────────────────────────────── */

export interface CheckedPayment {
    method: PaymentInput['method'];
    amount: number;
    tendered: number | null;
    change_due: number | null;
    reference_no: string | null;
}

export function checkPayment(p: PaymentInput, totalDue: number): CheckedPayment {
    if (p.method === 'cash') {
        if (p.tendered === undefined) throw new ApiError('Type the cash received.', 400, 'payment.tendered');
        if (toCents(p.tendered) < toCents(totalDue)) {
            throw new ApiError(`Cash is short: ₱${totalDue.toFixed(2)} is due.`, 422, 'payment.tendered', { code: 'INSUFFICIENT_CASH', total_due: totalDue });
        }
        return { method: 'cash', amount: totalDue, tendered: p.tendered, change_due: (toCents(p.tendered) - toCents(totalDue)) / 100, reference_no: null };
    }
    const ref = p.reference_no?.trim() ?? '';
    if (!/^[A-Za-z0-9 -]{6,30}$/.test(ref)) {
        throw new ApiError(`Type the ${p.method === 'gcash' ? 'GCash' : 'card'} reference number (6–30 letters or numbers).`, 400, 'payment.reference_no');
    }
    return { method: p.method, amount: totalDue, tendered: null, change_due: null, reference_no: ref };
}

/** Saves a settled payment inside the order's transaction. */
export const recordPayment = (
    db: Kysely<DB>,
    p: CheckedPayment & { order_id: number; shift_id: number | null; terminal_id: number; received_by: number | null },
) =>
    db
        .insertInto('payments')
        .values({
            order_id: p.order_id,
            shift_id: p.shift_id,
            terminal_id: p.terminal_id,
            received_by: p.received_by,
            method: p.method,
            amount: p.amount,
            tendered: p.tendered,
            change_due: p.change_due,
            reference_no: p.reference_no,
            status: 'settled',
            settled_at: sql`NOW()`,
        })
        .execute();
