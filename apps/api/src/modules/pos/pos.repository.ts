import { sql, type Transaction } from 'kysely';
import type { DB } from '../../config/database/types.gen';
import { db } from '../../services/database.service';

// Queries only the cashier register uses (slip scan, register lock).
// Everything shared — menu, orders, statuses — lives in src/pipeline/.

/** The order a scanned slip points at: store + order number. */
export const findForScan = (storeId: number, orderNumber: number) =>
    db
        .selectFrom('orders as o')
        .innerJoin('stores as s', 's.id', 'o.store_id')
        .leftJoin('terminals as lt', 'lt.id', 'o.locked_by_terminal_id')
        .select(['o.id', 'o.order_no', 'o.status', 'o.slip_token', 'o.placed_at', 'o.locked_by_terminal_id', 'o.locked_at', 's.code as store_code', 'lt.code as locked_by_code'])
        .where('o.store_id', '=', storeId)
        .where('o.order_number', '=', orderNumber)
        .executeTakeFirst();

export const lock = (orderId: number, terminalId: number) =>
    db.updateTable('orders').set({ locked_by_terminal_id: terminalId, locked_at: sql`NOW()` }).where('id', '=', orderId).execute();

/** Unlocks only if this register holds the lock. */
export const release = async (orderId: number, terminalId: number) =>
    Number(
        (
            await db
                .updateTable('orders')
                .set({ locked_by_terminal_id: null, locked_at: null })
                .where('id', '=', orderId)
                .where('locked_by_terminal_id', '=', terminalId)
                .executeTakeFirst()
        ).numUpdatedRows,
    ) === 1;

export const settings = (storeId: number, keys: string[]) =>
    db.selectFrom('settings').select(['key', 'value']).where('store_id', '=', storeId).where('key', 'in', keys).execute();

/* ── shifts ────────────────────────────────────────────────────────────── */

export const openShift = (terminalId: number) =>
    db
        .selectFrom('shifts as s')
        .innerJoin('terminals as t', 't.id', 's.terminal_id')
        .innerJoin('users as u', 'u.id', 's.cashier_id')
        .select(['s.id', 's.status', 's.opened_at', 's.opening_cash', 's.cashier_id', 't.code as terminal_code', 'u.name as cashier_name'])
        .where('s.terminal_id', '=', terminalId)
        .where('s.status', '=', 'open')
        .orderBy('s.id', 'desc')
        .executeTakeFirst();

export const createShift = async (storeId: number, terminalId: number, cashierId: number, openingCash: number) =>
    Number(
        (await db.insertInto('shifts').values({ store_id: storeId, terminal_id: terminalId, cashier_id: cashierId, opening_cash: openingCash }).executeTakeFirstOrThrow())
            .insertId,
    );

/* ── kiosk # list, next number ─────────────────────────────────────────── */

/** Kiosk orders still waiting for payment, placed within the last `withinMinutes`. */
export const kioskQueue = (storeId: number, withinMinutes: number) =>
    db
        .selectFrom('orders as o')
        .innerJoin('stores as s', 's.id', 'o.store_id')
        .leftJoin('terminals as lt', 'lt.id', 'o.locked_by_terminal_id')
        .select(['o.id', 'o.order_no', 'o.order_number', 'o.placed_at', 'o.dining_mode', 'o.item_count', 'o.total_due', 'o.slip_token', 's.code as store_code', 'lt.code as locked_by'])
        .where('o.store_id', '=', storeId)
        .where('o.source', '=', 'kiosk')
        .where('o.status', '=', 'awaiting_payment')
        .where('o.placed_at', '>=', sql<Date>`NOW() - INTERVAL ${withinMinutes} MINUTE`)
        .orderBy('o.placed_at')
        .execute();

export const lastOrderNumber = async (storeId: number) =>
    Number((await db.selectFrom('order_sequences').select('last_number').where('store_id', '=', storeId).executeTakeFirst())?.last_number ?? 0);

/** The order's status and lock (cancelling). */
export const orderState = (orderId: number) =>
    db
        .selectFrom('orders as o')
        .leftJoin('terminals as lt', 'lt.id', 'o.locked_by_terminal_id')
        .select(['o.id', 'o.store_id', 'o.order_no', 'o.status', 'o.locked_by_terminal_id', 'lt.code as locked_by'])
        .where('o.id', '=', orderId)
        .executeTakeFirst();

/* ── void + refund ─────────────────────────────────────────────────────── */

/** The order, and whether the shift it was paid in is still open. */
export const orderForVoid = (orderId: number) =>
    db
        .selectFrom('orders as o')
        .leftJoin('shifts as s', 's.id', 'o.shift_id')
        .select(['o.id', 'o.store_id', 'o.order_no', 'o.status', 'o.shift_id', 's.status as shift_status'])
        .where('o.id', '=', orderId)
        .executeTakeFirst();

export const markVoided = (trx: Transaction<DB>, orderId: number, managerId: number, reason: string) =>
    trx.updateTable('orders').set({ voided_by: managerId, void_reason: reason }).where('id', '=', orderId).execute();

export const refundPayments = (trx: Transaction<DB>, orderId: number) =>
    trx.updateTable('payments').set({ status: 'refunded' }).where('order_id', '=', orderId).where('status', '=', 'settled').execute();
