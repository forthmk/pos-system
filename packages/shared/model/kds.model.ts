import { Type, type Static } from '@sinclair/typebox';

/* ──────────────────────────────────────────────────────────────────────────
 * Kitchen display + Orders board (design §5.5–5.6, §7.8). A ticket is what
 * the chef sees: the order number, IN / OUT, and qty × name + extras — no
 * prices. Times come from the server (`server_time`) so a screen with a
 * wrong clock still counts the right minutes.
 * ────────────────────────────────────────────────────────────────────────── */

export const KdsQuerySchema = Type.Object({ station: Type.Optional(Type.Integer({ minimum: 1 })) });
export type KdsQuery = Static<typeof KdsQuerySchema>;

export interface KdsTicketLine {
    quantity: number;
    name: string;
    extras: string[];
}

export interface KdsTicket {
    order_id: number;
    order_no: string;
    display_no: string;
    source: 'kiosk' | 'pos';
    dining_mode: 'IN' | 'OUT';
    table_no: string | null;
    status: 'preparing' | 'completed';
    sent_to_kitchen_at: string;
    completed_at: string | null;
    lines: KdsTicketLine[];
}

export interface KdsStats {
    pending: number;
    /** Completed today. */
    completed: number;
    /** Average seconds from sent to kitchen → completed, today. */
    avg_prep_seconds: number | null;
}

export interface KdsTickets {
    station: { id: number; code: string; name: string } | null;
    tickets: KdsTicket[];
    stats: KdsStats;
    settings: { delay_minutes: number; recall_minutes: number };
    server_time: string;
}

/** The kiosk / counter Orders board: numbers only. */
export interface OrdersBoard {
    preparing: string[];
    ready: string[];
    server_time: string;
}

/** A message on the live feed (GET /api/live). */
export interface LiveMessage<T = Record<string, unknown>> {
    event: string;
    data: T;
    server_time: string;
}
