import { sql, type Transaction } from 'kysely';
import type { KdsStats, KdsTicket, OrdersBoard } from '@pos-system/shared';
import ApiError from '../apiError';
import type { DB } from '../config/database/types.gen';
import { db } from '../services/database.service';
import { connectedCount, publish } from './live';
import { displayNo } from './numbering';
import { moveStatus, type Actor } from './status';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · kitchen — what happens after an order is paid (design §5.5–5.6,
 * §7.8):
 *
 *   paid → preparing  (sent_to_kitchen_at)   shows on the kitchen display
 *   ✓ / drag to Completed → completed          number moves to "Ready" on the board
 *   Recall (≤ kds_recall_minutes)  → preparing  back to Pending, completed_at cleared
 *   Clear Served                    → cleared_at  off the display and the board
 *
 * A ticket has no prices: number, IN / OUT, qty × name + extras. With a
 * station (a KDS screen's own, or ?station=) only that station's lines show;
 * lines with no station show everywhere.
 *
 * SQL sits in `queries` so tests can swap it.
 * ────────────────────────────────────────────────────────────────────────── */

type Trx = Transaction<DB>;

const iso = (v: unknown) => new Date(v as string).toISOString();

export const queries = {
    settings: (storeId: number, keys: string[]) =>
        db.selectFrom('settings').select(['key', 'value']).where('store_id', '=', storeId).where('key', 'in', keys).execute(),
    station: (storeId: number, id: number) =>
        db.selectFrom('kds_stations').select(['id', 'code', 'name']).where('store_id', '=', storeId).where('id', '=', id).executeTakeFirst(),
    /** The station of the kitchen screen a chef signed in at. */
    terminalStation: async (terminalId: number) =>
        (await db.selectFrom('terminals').select('kds_station_id').where('id', '=', terminalId).executeTakeFirst())?.kds_station_id ?? null,
    /** Paid orders still on the kitchen display (not cleared). */
    openOrders: (storeId: number) =>
        db
            .selectFrom('orders')
            .select(['id', 'order_no', 'source', 'dining_mode', 'table_no', 'status', 'sent_to_kitchen_at', 'completed_at'])
            .where('store_id', '=', storeId)
            .where('status', 'in', ['preparing', 'completed'])
            .where('sent_to_kitchen_at', 'is not', null)
            .where('cleared_at', 'is', null)
            .orderBy('sent_to_kitchen_at')
            .orderBy('id')
            .execute(),
    lines: (orderIds: number[]) =>
        db
            .selectFrom('order_items')
            .select(['id', 'order_id', 'kds_station_id', 'name', 'quantity'])
            .where('order_id', 'in', orderIds)
            .orderBy('id')
            .execute(),
    extras: (lineIds: number[]) =>
        db.selectFrom('order_item_addons').select(['order_item_id', 'name']).where('order_item_id', 'in', lineIds).orderBy('id').execute(),
    /** Average prep time (seconds) of today's completed orders, in the DB's clock. */
    today: (storeId: number) =>
        db
            .selectFrom('orders')
            .select(sql<string | null>`AVG(TIMESTAMPDIFF(SECOND, sent_to_kitchen_at, completed_at))`.as('avg_prep'))
            .where('store_id', '=', storeId)
            .where('status', '=', 'completed')
            .where('sent_to_kitchen_at', 'is not', null)
            .where(sql<boolean>`completed_at >= CURDATE()`)
            .executeTakeFirstOrThrow(),
    order: (id: number) =>
        db
            .selectFrom('orders')
            .select(['id', 'store_id', 'order_no', 'status', 'cleared_at', sql<number | null>`TIMESTAMPDIFF(SECOND, completed_at, NOW())`.as('completed_ago')])
            .where('id', '=', id)
            .executeTakeFirst(),
    transaction: <T>(fn: (trx: Trx) => Promise<T>) => db.transaction().execute(fn),
    moveStatus: (trx: Trx, e: Parameters<typeof moveStatus>[1]) => moveStatus(trx, e),
    clearCompletedAt: (trx: Trx, id: number) => trx.updateTable('orders').set({ completed_at: null }).where('id', '=', id).execute(),
    clearServed: async (storeId: number) =>
        Number(
            (
                await db
                    .updateTable('orders')
                    .set({ cleared_at: sql`NOW()` })
                    .where('store_id', '=', storeId)
                    .where('status', '=', 'completed')
                    .where('cleared_at', 'is', null)
                    .executeTakeFirst()
            ).numUpdatedRows,
        ),
    boardOrders: (storeId: number) =>
        db
            .selectFrom('orders')
            .select(['order_no', 'status'])
            .where('store_id', '=', storeId)
            .where('status', 'in', ['preparing', 'completed'])
            .where('sent_to_kitchen_at', 'is not', null)
            .where('cleared_at', 'is', null)
            .orderBy('sent_to_kitchen_at')
            .orderBy('id')
            .execute(),
};

export async function kitchenSettings(storeId: number) {
    const s = Object.fromEntries((await queries.settings(storeId, ['kds_delay_minutes', 'kds_recall_minutes'])).map((r) => [r.key, r.value]));
    return { delay_minutes: Number(s.kds_delay_minutes ?? 5), recall_minutes: Number(s.kds_recall_minutes ?? 10) };
}

export const findStation = (storeId: number, id: number) => queries.station(storeId, id);
export const terminalStation = (terminalId: number) => queries.terminalStation(terminalId);

/** The tickets on the display. `orderId` = just that one (for the live event). */
export async function readTickets(storeId: number, stationId: number | null, orderId?: number): Promise<KdsTicket[]> {
    const orders = (await queries.openOrders(storeId)).filter((o) => orderId === undefined || o.id === orderId);
    if (!orders.length) return [];
    const lines = (await queries.lines(orders.map((o) => o.id))).filter((l) => stationId === null || l.kds_station_id === null || l.kds_station_id === stationId);
    const extras = lines.length ? await queries.extras(lines.map((l) => l.id)) : [];

    const extrasByLine = new Map<number, string[]>();
    for (const e of extras) extrasByLine.set(e.order_item_id, [...(extrasByLine.get(e.order_item_id) ?? []), e.name]);
    const linesByOrder = new Map<number, KdsTicket['lines']>();
    for (const l of lines) {
        linesByOrder.set(l.order_id, [...(linesByOrder.get(l.order_id) ?? []), { quantity: l.quantity, name: l.name, extras: extrasByLine.get(l.id) ?? [] }]);
    }

    return orders
        .filter((o) => linesByOrder.has(o.id)) // nothing for this station
        .map((o) => ({
            order_id: o.id,
            order_no: o.order_no,
            display_no: displayNo(o.order_no),
            source: o.source,
            dining_mode: o.dining_mode,
            table_no: o.table_no,
            status: o.status as KdsTicket['status'],
            sent_to_kitchen_at: iso(o.sent_to_kitchen_at),
            completed_at: o.completed_at ? iso(o.completed_at) : null,
            lines: linesByOrder.get(o.id)!,
        }));
}

export async function readStats(storeId: number, tickets: KdsTicket[]): Promise<KdsStats> {
    const t = await queries.today(storeId);
    return {
        // Design §5.6: Pending = preparing; Completed = completed, not yet cleared.
        pending: tickets.filter((x) => x.status === 'preparing').length,
        completed: tickets.filter((x) => x.status === 'completed').length,
        avg_prep_seconds: t.avg_prep === null ? null : Math.round(Number(t.avg_prep)),
    };
}

export interface KitchenAction {
    storeId: number;
    orderId: number;
    actor: Actor;
    userId?: number | null;
    terminalId?: number | null;
}

const findOrder = async (storeId: number, id: number) => {
    const o = await queries.order(id);
    if (!o || o.store_id !== storeId) throw new ApiError('Order not found.', 404);
    return o;
};

/** ✓ / dragged to Completed: preparing → completed. */
export async function completeOrder(a: KitchenAction) {
    const o = await findOrder(a.storeId, a.orderId);
    if (o.status !== 'preparing') throw new ApiError(`${o.order_no} is not being prepared.`, 409, 'status', { code: 'NOT_PREPARING', status: o.status });
    await queries.transaction((trx) =>
        queries.moveStatus(trx, { order_id: o.id, from_status: 'preparing', to_status: 'completed', actor_type: a.actor, user_id: a.userId ?? null, terminal_id: a.terminalId ?? null }),
    );
    return { order_id: o.id, order_no: o.order_no, display_no: displayNo(o.order_no) };
}

/** Recall: completed → preparing, only within kds_recall_minutes and before Clear Served. */
export async function recallOrder(a: KitchenAction) {
    const o = await findOrder(a.storeId, a.orderId);
    if (o.status !== 'completed') throw new ApiError(`${o.order_no} is not completed.`, 409, 'status', { code: 'NOT_COMPLETED', status: o.status });
    const { recall_minutes } = await kitchenSettings(a.storeId);
    if (o.cleared_at || o.completed_ago === null || Number(o.completed_ago) > recall_minutes * 60) {
        throw new ApiError(`${o.order_no} can only be recalled within ${recall_minutes} minutes of completing.`, 409, 'status', { code: 'RECALL_EXPIRED' });
    }
    await queries.transaction(async (trx) => {
        await queries.moveStatus(trx, { order_id: o.id, from_status: 'completed', to_status: 'preparing', actor_type: a.actor, user_id: a.userId ?? null, terminal_id: a.terminalId ?? null, note: 'Recall' });
        await queries.clearCompletedAt(trx, o.id);
    });
    return { order_id: o.id, order_no: o.order_no, display_no: displayNo(o.order_no) };
}

/** Clear Served: every completed ticket leaves the display and the board. */
export const clearServed = async (storeId: number) => ({ cleared: await queries.clearServed(storeId) });

/**
 * order.sent_to_kitchen with the ticket (design §7.8). Built only when a
 * screen of the store is connected; a failure here never fails the sale.
 */
export async function announceSentToKitchen(storeId: number, orderId: number) {
    if (!connectedCount(storeId)) return;
    try {
        const [ticket] = await readTickets(storeId, null, orderId);
        if (ticket) publish(storeId, 'order.sent_to_kitchen', { order_id: orderId, display_no: ticket.display_no, ticket });
    } catch {
        publish(storeId, 'order.sent_to_kitchen', { order_id: orderId });
    }
}

/** Orders board (kiosk start screen / counter TV): Preparing and Ready numbers. */
export async function readBoard(storeId: number): Promise<OrdersBoard> {
    const rows = await queries.boardOrders(storeId);
    return {
        preparing: rows.filter((r) => r.status === 'preparing').map((r) => displayNo(r.order_no)),
        ready: rows.filter((r) => r.status === 'completed').map((r) => displayNo(r.order_no)),
        server_time: new Date().toISOString(),
    };
}
