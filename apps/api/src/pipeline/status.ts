import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import ApiError from '../apiError';
import type { DB } from '../config/database/types.gen';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · status — an order's life (design §4.4) and its history in
 * order_status_events: who (kiosk / cashier / chef / manager / system),
 * which terminal, from → to.
 *
 *   awaiting_payment → preparing   paid (cashier settles / provider confirms)
 *   awaiting_payment → cancelled   cancelled, or not paid within the expiry
 *   preparing        → completed   chef bumps
 *   completed        → preparing   recall (≤ kds_recall_minutes)
 *   preparing / completed → voided   manager void + refund
 * ────────────────────────────────────────────────────────────────────────── */

export type OrderStatus = 'awaiting_payment' | 'preparing' | 'completed' | 'cancelled' | 'voided';
export type Actor = 'kiosk' | 'cashier' | 'chef' | 'manager' | 'system';
/** Works with `db` or a transaction. */
type Executor = Kysely<DB>;

export const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
    awaiting_payment: ['preparing', 'cancelled'],
    preparing: ['completed', 'voided'],
    completed: ['preparing', 'voided'],
    cancelled: [],
    voided: [],
};

export const canMove = (from: OrderStatus, to: OrderStatus) => ALLOWED[from].includes(to);

export interface OrderEvent {
    order_id: number;
    event_type?: 'status' | 'slip_printed' | 'scanned' | 'edited';
    from_status: OrderStatus | null;
    to_status: OrderStatus | null;
    actor_type: Actor;
    user_id?: number | null;
    terminal_id?: number | null;
    note?: string | null;
}

export const logEvent = (db: Executor, e: OrderEvent) =>
    db
        .insertInto('order_status_events')
        .values({
            order_id: e.order_id,
            event_type: e.event_type ?? 'status',
            from_status: e.from_status,
            to_status: e.to_status,
            actor_type: e.actor_type,
            user_id: e.user_id ?? null,
            terminal_id: e.terminal_id ?? null,
            note: e.note ?? null,
        })
        .execute();

// The time column each status stamps.
const STAMP: Partial<Record<OrderStatus, 'cancelled_at' | 'completed_at' | 'voided_at'>> = {
    cancelled: 'cancelled_at',
    completed: 'completed_at',
    voided: 'voided_at',
};

/**
 * Moves an order from → to, only if it is still `from` (two screens acting at
 * once: the second gets 409), stamps the time, clears a register lock, and
 * logs the event.
 */
export async function moveStatus(db: Executor, e: OrderEvent & { from_status: OrderStatus; to_status: OrderStatus }) {
    if (!canMove(e.from_status, e.to_status)) {
        throw new ApiError(`An order that is ${e.from_status.replace('_', ' ')} can't become ${e.to_status.replace('_', ' ')}.`, 409);
    }
    const stamp = STAMP[e.to_status];
    const result = await db
        .updateTable('orders')
        .set({
            status: e.to_status,
            locked_by_terminal_id: null,
            locked_at: null,
            ...(stamp ? { [stamp]: sql`NOW()` } : {}),
        })
        .where('id', '=', e.order_id)
        .where('status', '=', e.from_status)
        .executeTakeFirst();
    if (Number(result.numUpdatedRows) !== 1) throw new ApiError('This order was just changed on another screen. Please look again.', 409);
    await logEvent(db, e);
}
