import { sql } from 'kysely';
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
