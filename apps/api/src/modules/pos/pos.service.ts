import { parseSlipCode, type ScanResult } from '@pos-system/shared';
import ApiError from '../../apiError';
import * as menu from '../../pipeline/menu';
import * as orders from '../../pipeline/orders';
import * as status from '../../pipeline/status';
import { db } from '../../services/database.service';
import type { Principal } from '../../types/fastify';
import * as repository from './pos.repository';

// The cashier register (design §5.3–5.4, §5.10). Shared work — menu, pricing,
// numbering, orders, statuses — goes through src/pipeline/.

/** The register's menu: English names (receipts, kitchen), SKU codes. */
export const readMenu = (storeId: number) => menu.readMenu(storeId, 'en');

/** Sold out / back in (design decision 19). */
export const setItemAvailability = menu.setItemAvailability;
export const setAddonAvailability = menu.setAddonAvailability;

/** Scanning and locking need a cashier signed in at a register. */
const register = (principal: Principal) => {
    if (principal.kind !== 'staff' || principal.terminal?.type !== 'pos') {
        throw new ApiError('Sign in at a cashier register to scan slips.', 400);
    }
    return { storeId: principal.store_id, terminalId: principal.terminal.id, userId: principal.id };
};

const minutesAgo = (date: Date | string, minutes: number) => new Date(date).getTime() < Date.now() - minutes * 60_000;

/**
 * GET /pos/scan/:code — a kiosk slip was scanned (design §5.10, §7.11).
 * Awaiting payment → lock it to this register and return it; already paid,
 * expired (not paid within `awaiting_payment_expiry_minutes` — cancelled
 * here), voided, or open on another register → say so.
 */
export async function scan(principal: Principal, raw: string): Promise<ScanResult> {
    const { storeId, terminalId, userId } = register(principal);
    const parsed = parseSlipCode(raw);
    if (!parsed) throw new ApiError('That code can’t be read. Scan again or type the number.', 400, 'code', { code: 'BAD_CODE' });

    const order = await repository.findForScan(storeId, parsed.orderNumber);
    if (!order || order.store_code.padStart(2, '0').slice(-2) !== parsed.store || order.slip_token !== parsed.slipToken) {
        throw new ApiError('Slip not recognised.', 404, 'code', { code: 'SLIP_NOT_FOUND' });
    }

    if (order.status === 'preparing' || order.status === 'completed') return { result: 'already_paid', order_no: order.order_no, status: order.status };
    if (order.status === 'voided') return { result: 'voided', order_no: order.order_no };

    const setting = Object.fromEntries((await repository.settings(storeId, ['awaiting_payment_expiry_minutes', 'order_lock_minutes'])).map((s) => [s.key, s.value]));
    const expiry = Number(setting.awaiting_payment_expiry_minutes ?? 30);
    const lockMinutes = Number(setting.order_lock_minutes ?? 5);

    if (order.status === 'awaiting_payment' && minutesAgo(order.placed_at, expiry)) {
        await db.transaction().execute((trx) =>
            status.moveStatus(trx, { order_id: order.id, from_status: 'awaiting_payment', to_status: 'cancelled', actor_type: 'system', note: `Not paid within ${expiry} minutes` }),
        );
        return { result: 'expired', order: await orders.getOrder(order.id, storeId) };
    }
    if (order.status === 'cancelled') return { result: 'expired', order: await orders.getOrder(order.id, storeId) };

    const heldElsewhere =
        order.locked_by_terminal_id && order.locked_by_terminal_id !== terminalId && order.locked_at && !minutesAgo(order.locked_at, lockMinutes);
    if (heldElsewhere) return { result: 'in_use', order_no: order.order_no, terminal: order.locked_by_code ?? 'another register' };

    await repository.lock(order.id, terminalId);
    await status.logEvent(db, { order_id: order.id, event_type: 'scanned', from_status: null, to_status: null, actor_type: 'cashier', user_id: userId, terminal_id: terminalId });
    return {
        result: 'ready',
        order: await orders.getOrder(order.id, storeId),
        locked_until: new Date(Date.now() + lockMinutes * 60_000).toISOString(),
    };
}

/** POST /pos/orders/:id/release — CLEAR / Next Customer without paying. */
export async function release(principal: Principal, orderId: number) {
    const { terminalId } = register(principal);
    return { released: await repository.release(orderId, terminalId) };
}
