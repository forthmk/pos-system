import {
    parseSlipCode,
    slipCode,
    type CloseShiftBody,
    type DiscountInput,
    type KioskQueueItem,
    type OpenShiftBody,
    type PosOrderBody,
    type ScanResult,
    type SettleBody,
    type ShiftSummary,
    type VoidOrderBody,
    type VoucherCheck,
} from '@pos-system/shared';
import ApiError from '../../apiError';
import * as discounts from '../../pipeline/discounts';
import * as menu from '../../pipeline/menu';
import { displayNo, formatOrderNo } from '../../pipeline/numbering';
import { publish } from '../../pipeline/live';
import * as orders from '../../pipeline/orders';
import * as reports from '../../pipeline/reports';
import { verifyApprover } from '../auth/auth.service';
import { priceOrder } from '../../pipeline/pricing';
import * as status from '../../pipeline/status';
import { db } from '../../services/database.service';
import type { Principal } from '../../types/fastify';
import * as repository from './pos.repository';

/* ──────────────────────────────────────────────────────────────────────────
 * The cashier register (design §5.3–5.4, §5.7, §5.10). Everything shared —
 * menu, discounts, pricing, numbering, orders, payments, statuses — goes
 * through src/pipeline/. Every action here needs a cashier signed in at a
 * register (POS-01); selling also needs that register's shift to be open.
 * ────────────────────────────────────────────────────────────────────────── */

/** The register's menu: English names (receipts, kitchen), SKU codes. */
export const readMenu = (storeId: number) => menu.readMenu(storeId, 'en');

/** Sold out / back in (design decision 19). */
export const setItemAvailability = menu.setItemAvailability;
export const setAddonAvailability = menu.setAddonAvailability;

const register = (principal: Principal) => {
    if (principal.kind !== 'staff' || principal.terminal?.type !== 'pos') {
        throw new ApiError('Sign in at a cashier register first.', 400, undefined, { code: 'NO_REGISTER' });
    }
    return { storeId: principal.store_id, terminalId: principal.terminal.id, terminalCode: principal.terminal.code, userId: principal.id };
};

const settingsOf = async (storeId: number, keys: string[]) => Object.fromEntries((await repository.settings(storeId, keys)).map((s) => [s.key, s.value]));
const minutesAgo = (date: Date | string, minutes: number) => new Date(date).getTime() < Date.now() - minutes * 60_000;

/* ── shifts (design §5.7) ──────────────────────────────────────────────── */

const toShift = (s: NonNullable<Awaited<ReturnType<typeof repository.openShift>>>): ShiftSummary => ({
    id: s.id,
    terminal_code: s.terminal_code,
    cashier_name: s.cashier_name,
    opened_at: new Date(s.opened_at as unknown as string).toISOString(),
    opening_cash: Number(s.opening_cash),
    status: s.status,
});

export async function currentShift(principal: Principal): Promise<{ shift: ShiftSummary | null }> {
    const { terminalId } = register(principal);
    const s = await repository.openShift(terminalId);
    return { shift: s ? toShift(s) : null };
}

/** Starting cash (float). One open shift per register. */
export async function openShift(principal: Principal, body: OpenShiftBody): Promise<{ shift: ShiftSummary }> {
    const { storeId, terminalId, terminalCode, userId } = register(principal);
    const open = await repository.openShift(terminalId);
    if (open) throw new ApiError(`${terminalCode} already has an open shift (${open.cashier_name}).`, 409, undefined, { code: 'SHIFT_OPEN' });
    await repository.createShift(storeId, terminalId, userId, body.opening_cash);
    return { shift: toShift((await repository.openShift(terminalId))!) };
}

const sellingShift = async (terminalId: number) => {
    const s = await repository.openShift(terminalId);
    if (!s) throw new ApiError('Open a shift first (starting cash).', 409, undefined, { code: 'NO_OPEN_SHIFT' });
    return s.id;
};

/* ── discounts, vouchers, numbers ──────────────────────────────────────── */

export const discountTypes = (principal: Principal) => discounts.listTypes(register(principal).storeId);

/** Checks a voucher before PROCEED and shows what it takes off. */
export async function checkVoucher(principal: Principal, code: string, subtotal: number): Promise<VoucherCheck> {
    const { storeId } = register(principal);
    const d = (await discounts.resolveDiscount(storeId, { type: 'VOUCHER', code }))!;
    discounts.assertMinSpend(d, subtotal);
    const priced = priceOrder([{ unit_price: subtotal, addon_prices: [], quantity: 1 }], d.pricing);
    return {
        code: code.trim().toUpperCase(),
        kind: d.pricing.kind === 'fixed' ? 'fixed' : 'percent',
        value: d.pricing.kind === 'fixed' ? d.pricing.value : Math.round((d.pricing as { rate: number }).rate * 10000) / 100,
        amount: priced.discount_total,
    };
}

/** The receipt header's ORD-000750 preview — the real number is given on save. */
export async function nextNumber(principal: Principal) {
    const { storeId } = register(principal);
    const s = await settingsOf(storeId, ['order_number_prefix', 'order_number_digits']);
    const order_no = formatOrderNo((await repository.lastOrderNumber(storeId)) + 1, s.order_number_prefix ?? 'ORD-', Number(s.order_number_digits ?? 6));
    return { order_no, display_no: displayNo(order_no) };
}

/** Kiosk # list: kiosk orders waiting for payment (backup for a lost slip). */
export async function kioskQueue(principal: Principal): Promise<KioskQueueItem[]> {
    const { storeId } = register(principal);
    const s = await settingsOf(storeId, ['awaiting_payment_expiry_minutes']);
    return (await repository.kioskQueue(storeId, Number(s.awaiting_payment_expiry_minutes ?? 30))).map((o) => ({
        id: o.id,
        order_no: o.order_no,
        display_no: displayNo(o.order_no),
        placed_at: new Date(o.placed_at as unknown as string).toISOString(),
        dining_mode: o.dining_mode,
        item_count: o.item_count,
        total_due: Number(o.total_due),
        slip_code: o.slip_token ? slipCode(o.store_code, o.order_number, o.slip_token) : null,
        locked_by: o.locked_by,
    }));
}

/* ── selling ───────────────────────────────────────────────────────────── */

const resolveDiscount = (storeId: number, d?: DiscountInput) => discounts.resolveDiscount(storeId, d);

/** A walk-in order, paid now → straight to the kitchen (design §7.4). */
export async function placeOrder(principal: Principal, body: PosOrderBody) {
    const { storeId, terminalId, userId } = register(principal);
    const shiftId = await sellingShift(terminalId);
    return orders.placeOrder({
        storeId,
        terminalId,
        source: 'pos',
        actor: 'cashier',
        userId,
        shiftId,
        clientRef: body.client_ref,
        diningMode: body.dining_mode,
        language: 'en',
        paymentMethod: body.payment.method,
        lines: body.lines,
        discount: await resolveDiscount(storeId, body.discount),
        payment: body.payment,
        status: 'preparing',
    });
}

/** Take payment for a scanned kiosk order → it goes to the kitchen (design §5.10). */
export async function settle(principal: Principal, orderId: number, body: SettleBody) {
    const { storeId, terminalId, userId } = register(principal);
    const shiftId = await sellingShift(terminalId);
    return orders.settleOrder({
        storeId,
        orderId,
        terminalId,
        userId,
        shiftId,
        discount: await resolveDiscount(storeId, body.discount),
        payment: body.payment,
        lines: body.lines,
    });
}

/** Cancel an unpaid order (design §8.1). */
export async function cancel(principal: Principal, orderId: number) {
    const { storeId, terminalId, userId } = register(principal);
    const o = await repository.orderState(orderId);
    if (!o || o.store_id !== storeId) throw new ApiError('Order not found.', 404);
    if (o.locked_by_terminal_id && o.locked_by_terminal_id !== terminalId) throw new ApiError(`${o.order_no} is being processed at ${o.locked_by ?? 'another register'}.`, 409);
    await db.transaction().execute((trx) =>
        status.moveStatus(trx, { order_id: o.id, from_status: o.status as status.OrderStatus, to_status: 'cancelled', actor_type: 'cashier', user_id: userId, terminal_id: terminalId }),
    );
    publish(storeId, 'order.cancelled', { order_id: o.id, order_no: o.order_no });
    return orders.getOrder(o.id, storeId);
}

/* ── kiosk slip scan (design §5.10, §7.11) ─────────────────────────────── */

/**
 * GET /pos/scan/:code — awaiting payment → lock it to this register and
 * return it; already paid, expired (not paid within
 * `awaiting_payment_expiry_minutes` — cancelled here), voided, or open on
 * another register → say so.
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

    const setting = await settingsOf(storeId, ['awaiting_payment_expiry_minutes', 'order_lock_minutes']);
    const expiry = Number(setting.awaiting_payment_expiry_minutes ?? 30);
    const lockMinutes = Number(setting.order_lock_minutes ?? 5);

    if (order.status === 'awaiting_payment' && minutesAgo(order.placed_at, expiry)) {
        await db.transaction().execute((trx) =>
            status.moveStatus(trx, { order_id: order.id, from_status: 'awaiting_payment', to_status: 'cancelled', actor_type: 'system', note: `Not paid within ${expiry} minutes` }),
        );
        publish(storeId, 'order.cancelled', { order_id: order.id, order_no: order.order_no, expired: true });
        return { result: 'expired', order: await orders.getOrder(order.id, storeId) };
    }
    if (order.status === 'cancelled') return { result: 'expired', order: await orders.getOrder(order.id, storeId) };

    const heldElsewhere =
        order.locked_by_terminal_id && order.locked_by_terminal_id !== terminalId && order.locked_at && !minutesAgo(order.locked_at, lockMinutes);
    if (heldElsewhere) return { result: 'in_use', order_no: order.order_no, terminal: order.locked_by_code ?? 'another register' };

    await repository.lock(order.id, terminalId);
    publish(storeId, 'order.locked', { order_id: order.id, order_no: order.order_no, terminal: register(principal).terminalCode });
    await status.logEvent(db, { order_id: order.id, event_type: 'scanned', from_status: null, to_status: null, actor_type: 'cashier', user_id: userId, terminal_id: terminalId });
    return {
        result: 'ready',
        order: await orders.getOrder(order.id, storeId),
        locked_until: new Date(Date.now() + lockMinutes * 60_000).toISOString(),
    };
}

/** POST /pos/orders/:id/release — CLEAR / Next Customer without paying. */
export async function release(principal: Principal, orderId: number) {
    const { storeId, terminalId } = register(principal);
    const released = await repository.release(orderId, terminalId);
    if (released) publish(storeId, 'order.released', { order_id: orderId });
    return { released };
}

/* ── reports, close shift, void (design §5.7, §7.9, decision 16) ───────── */

/** A cashier sees only their own shifts; managers / admins every shift of the store. */
const ownShiftsOnly = (principal: Principal) => (principal.kind === 'staff' && principal.role === 'cashier' ? principal.id : null);

const assertMayRead = async (principal: Principal, shiftId: number) => {
    const s = await reports.findShift(shiftId, principal.store_id);
    const own = ownShiftsOnly(principal);
    if (own !== null && s.cashier_id !== own) throw new ApiError('You can only see your own shifts.', 403);
    return s;
};

export const listShifts = (principal: Principal) => reports.listShifts(principal.store_id, ownShiftsOnly(principal));

export async function shiftReport(principal: Principal, shiftId: number) {
    await assertMayRead(principal, shiftId);
    return reports.readReport(shiftId, principal.store_id);
}

/** Export CSV / Z-Read → { filename, csv }. */
export async function shiftCsv(principal: Principal, shiftId: number) {
    const report = await shiftReport(principal, shiftId);
    const z = report.z_reading ? `Z-${String(report.z_reading.z_number).padStart(4, '0')}` : 'X';
    const day = reports.localTime(report.shift.opened_at).slice(0, 10);
    return { filename: `${report.shift.terminal_code}-${z}-${day}.csv`, csv: await reports.shiftCsv(report) };
}

/** Close Shift: counted cash → Z-reading. The cashier closes their own shift; a manager any. */
export async function closeShift(principal: Principal, shiftId: number, body: CloseShiftBody) {
    if (principal.kind !== 'staff') throw new ApiError('Sign in with your PIN to close a shift.', 403);
    await assertMayRead(principal, shiftId);
    const report = await reports.closeShift({ shiftId, storeId: principal.store_id, countedCash: body.counted_cash, userId: principal.id });
    publish(principal.store_id, 'shift.closed', { shift_id: shiftId, z_number: report.z_reading?.z_number });
    return report;
}

/**
 * Void + refund a paid order (decision 16): a manager approves with their
 * username + PIN. Only while the shift it was paid in is still open — a
 * closed Z-reading never changes. The order becomes voided (gone from the
 * kitchen and the board), its payment refunded; the report counts it under
 * voids and the expected cash goes down by a cash refund.
 */
export async function voidOrder(principal: Principal, orderId: number, body: VoidOrderBody) {
    const storeId = principal.store_id;
    const manager = await verifyApprover(body.manager_username, body.manager_pin, 'orders.void', storeId);
    const o = await repository.orderForVoid(orderId);
    if (!o || o.store_id !== storeId) throw new ApiError('Order not found.', 404);
    if (o.status === 'voided') throw new ApiError(`${o.order_no} is already voided.`, 409, 'status', { code: 'ALREADY_VOIDED' });
    if (o.status !== 'preparing' && o.status !== 'completed') {
        throw new ApiError(`${o.order_no} was never paid — cancel it instead.`, 409, 'status', { code: 'NOT_PAID', status: o.status });
    }
    if (o.shift_status !== 'open') {
        throw new ApiError(`${o.order_no} is in a closed shift (Z-reading) and can't be voided.`, 409, 'status', { code: 'SHIFT_CLOSED' });
    }
    const reason = body.reason.trim();
    await db.transaction().execute(async (trx) => {
        await status.moveStatus(trx, {
            order_id: o.id,
            from_status: o.status as status.OrderStatus,
            to_status: 'voided',
            actor_type: 'manager',
            user_id: manager.id,
            terminal_id: principal.kind === 'staff' ? (principal.terminal?.id ?? null) : null,
            note: reason,
        });
        await repository.markVoided(trx, o.id, manager.id, reason);
        await repository.refundPayments(trx, o.id);
    });
    publish(storeId, 'order.voided', { order_id: o.id, order_no: o.order_no, display_no: displayNo(o.order_no) });
    return orders.getOrder(o.id, storeId);
}
