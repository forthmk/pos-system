import type { Transaction } from 'kysely';
import type { DB } from '../config/database/types.gen';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · numbering — the store's running order number (design §7.7).
 * Called inside the order's own transaction: the row lock means a kiosk and
 * the cashier saving at the same moment can never get the same number, and a
 * failed save rolls the number back (no gaps from errors).
 * ────────────────────────────────────────────────────────────────────────── */

export const formatOrderNo = (n: number, prefix = 'ORD-', digits = 6) => `${prefix}${String(n).padStart(digits, '0')}`;
/** The 6 digits shown on the KDS, the kiosk and the slip: 000749. */
export const displayNo = (orderNo: string) => orderNo.replace(/^\D+/, '');

export async function nextOrderNumber(trx: Transaction<DB>, storeId: number): Promise<{ order_number: number; order_no: string }> {
    const row = await trx
        .selectFrom('order_sequences')
        .select('last_number')
        .where('store_id', '=', storeId)
        .forUpdate()
        .executeTakeFirst();
    const settings = await trx
        .selectFrom('settings')
        .select(['key', 'value'])
        .where('store_id', '=', storeId)
        .where('key', 'in', ['order_number_prefix', 'order_number_digits'])
        .execute();
    const setting = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    const next = Number(row?.last_number ?? 0) + 1;
    if (row) await trx.updateTable('order_sequences').set({ last_number: next }).where('store_id', '=', storeId).execute();
    else await trx.insertInto('order_sequences').values({ store_id: storeId, last_number: next }).execute();

    return { order_number: next, order_no: formatOrderNo(next, setting.order_number_prefix ?? 'ORD-', Number(setting.order_number_digits ?? 6)) };
}
