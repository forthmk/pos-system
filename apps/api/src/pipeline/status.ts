import type { Transaction } from 'kysely';
import type { DB } from '../config/database/types.gen';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · status — every change to an order's life is written to
 * order_status_events (design §4.4): who (kiosk / cashier / chef / manager /
 * system), which terminal, from → to. The allowed transitions (pay, bump,
 * recall, cancel, void) are added here as the screens that make them land
 * (QB-006 / QB-007 / QB-008).
 * ────────────────────────────────────────────────────────────────────────── */

export type OrderStatus = 'awaiting_payment' | 'preparing' | 'completed' | 'cancelled' | 'voided';
export type Actor = 'kiosk' | 'cashier' | 'chef' | 'manager' | 'system';

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

export const logEvent = (trx: Transaction<DB>, e: OrderEvent) =>
    trx
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
