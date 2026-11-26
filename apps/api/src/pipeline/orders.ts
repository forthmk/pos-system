import { randomInt } from 'node:crypto';
import { sql, type Insertable, type Transaction } from 'kysely';
import {
    slipCode,
    type DiningMode,
    type Language,
    type OrderLineInput,
    type OrderSummary,
    type PaymentInput,
    type PaymentMethod,
} from '@pos-system/shared';
import ApiError from '../apiError';
import type { DB, OrderDiscounts, OrderItemAddons, OrderItems, Orders } from '../config/database/types.gen';
import { db } from '../services/database.service';
import { assertMinSpend, type ResolvedDiscount } from './discounts';
import { announceSentToKitchen } from './kitchen';
import { publish } from './live';
import { displayNo, nextOrderNumber } from './numbering';
import { checkPayment, recordPayment, type CheckedPayment } from './payments';
import { priceOrder, toCents, type PricedOrder } from './pricing';
import { logEvent, moveStatus, type Actor, type OrderStatus } from './status';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · orders — saving and reading orders for every screen
 * (design §5.8 / §7, "Server — processing an order"):
 *
 *   placeOrder (kiosk Proceed, cashier walk-in)
 *     1. same client_ref already saved?  → return that order (no duplicates)
 *     2. merge identical lines, load them from the menu: active, available,
 *        extras offered for that item?                       else 409
 *     3. price with pipeline/pricing (+ discount) — screen prices never used
 *     4. differs from what the screen showed?   → 409 TOTAL_CHANGED
 *     5. payment checked (cash ≥ total, reference no.)
 *     6. one transaction: order number, order, lines, extras (names / prices
 *        copied), discount, payment, first status event
 *
 *   settleOrder (cashier takes payment for a scanned kiosk order)
 *     still awaiting payment, not held by another register → discount +
 *     payment → preparing (sent to the kitchen) in one transaction. Lines
 *     keep their kiosk prices unless the cashier changed them (then they are
 *     priced from today's menu).
 *
 * SQL sits in `queries` so tests can swap it.
 * ────────────────────────────────────────────────────────────────────────── */

type Trx = Transaction<DB>;

export const queries = {
    items: (storeId: number, ids: number[]) =>
        db
            .selectFrom('menu_items as m')
            .innerJoin('categories as c', 'c.id', 'm.category_id')
            .select(['m.id', 'm.sku', 'm.name', 'm.price', 'm.is_available', 'c.kds_station_id'])
            .where('c.store_id', '=', storeId)
            .where('c.is_active', '=', 1)
            .where('m.is_active', '=', 1)
            .where('m.id', 'in', ids)
            .execute(),
    itemAddons: (itemIds: number[]) =>
        db
            .selectFrom('menu_item_addons as mia')
            .innerJoin('addons as a', 'a.id', 'mia.addon_id')
            .select(['mia.menu_item_id', 'a.id', 'a.name', 'a.price', 'mia.price_override', 'a.is_available', 'a.is_active'])
            .where('mia.menu_item_id', 'in', itemIds)
            .execute(),
    byClientRef: (clientRef: string) => db.selectFrom('orders').select(['id', 'store_id']).where('client_ref', '=', clientRef).executeTakeFirst(),
    order: (id: number) =>
        db
            .selectFrom('orders as o')
            .innerJoin('stores as s', 's.id', 'o.store_id')
            .leftJoin('terminals as lt', 'lt.id', 'o.locked_by_terminal_id')
            .selectAll('o')
            .select(['s.code as store_code', 'lt.code as locked_by_code'])
            .where('o.id', '=', id)
            .executeTakeFirst(),
    orderItems: (orderId: number) =>
        db
            .selectFrom('order_items')
            .select(['id', 'menu_item_id', 'kds_station_id', 'sku', 'name', 'quantity', 'unit_price', 'addons_total', 'line_total'])
            .where('order_id', '=', orderId)
            .orderBy('id')
            .execute(),
    orderItemAddons: (orderItemIds: number[]) =>
        db
            .selectFrom('order_item_addons')
            .select(['order_item_id', 'addon_id', 'name', 'price'])
            .where('order_item_id', 'in', orderItemIds)
            .orderBy('id')
            .execute(),
    orderDiscount: (orderId: number) =>
        db
            .selectFrom('order_discounts as d')
            .innerJoin('discount_types as t', 't.id', 'd.discount_type_id')
            .leftJoin('vouchers as v', 'v.id', 'd.voucher_id')
            .select(['t.code', 't.name', 't.kind', 'v.code as voucher_code', 'd.rate', 'd.base_amount', 'd.vat_removed', 'd.amount', 'd.id_number', 'd.holder_name'])
            .where('d.order_id', '=', orderId)
            .executeTakeFirst(),
    orderPayment: (orderId: number) =>
        db
            .selectFrom('payments')
            .select(['method', 'amount', 'tendered', 'change_due', 'reference_no'])
            .where('order_id', '=', orderId)
            .where('status', '=', 'settled')
            .orderBy('id', 'desc')
            .executeTakeFirst(),
    transaction: <T>(fn: (trx: Trx) => Promise<T>) => db.transaction().execute(fn),
    nextOrderNumber: (trx: Trx, storeId: number) => nextOrderNumber(trx, storeId),
    insertOrder: async (trx: Trx, values: Insertable<Orders>) => Number((await trx.insertInto('orders').values(values).executeTakeFirstOrThrow()).insertId),
    insertItem: async (trx: Trx, values: Insertable<OrderItems>) => Number((await trx.insertInto('order_items').values(values).executeTakeFirstOrThrow()).insertId),
    insertItemAddons: (trx: Trx, rows: Insertable<OrderItemAddons>[]) => trx.insertInto('order_item_addons').values(rows).execute(),
    deleteItems: (trx: Trx, orderId: number) => trx.deleteFrom('order_items').where('order_id', '=', orderId).execute(),
    insertDiscount: (trx: Trx, row: Insertable<OrderDiscounts>) => trx.insertInto('order_discounts').values(row).execute(),
    useVoucher: (trx: Trx, voucherId: number) =>
        trx.updateTable('vouchers').set({ used_count: sql`used_count + 1` }).where('id', '=', voucherId).execute(),
    markPaid: (trx: Trx, orderId: number, values: Record<string, unknown>) =>
        trx
            .updateTable('orders')
            .set({ ...values, paid_at: sql`NOW()`, sent_to_kitchen_at: sql`NOW()` } as never)
            .where('id', '=', orderId)
            .execute(),
    recordPayment: (trx: Trx, p: Parameters<typeof recordPayment>[1]) => recordPayment(trx, p),
    moveStatus: (trx: Trx, e: Parameters<typeof moveStatus>[1]) => moveStatus(trx, e),
    logEvent: (trx: Trx, e: Parameters<typeof logEvent>[1]) => logEvent(trx, e),
};

/* ── lines ─────────────────────────────────────────────────────────────── */

export interface ResolvedLine {
    menu_item_id: number;
    sku: string;
    name: string;
    unit_price: number;
    kds_station_id: number | null;
    addons: { id: number; name: string; price: number }[];
    quantity: number;
}

const lineKey = (l: OrderLineInput) => `${l.menu_item_id}:${[...l.addon_ids].sort((a, b) => a - b).join(',')}`;

/** Same item with the same extras → one line, quantities added (§7.6). */
export function mergeLines(lines: OrderLineInput[]): OrderLineInput[] {
    const merged = new Map<string, OrderLineInput>();
    for (const l of lines) {
        const key = lineKey(l);
        const prev = merged.get(key);
        merged.set(key, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { ...l, addon_ids: [...l.addon_ids].sort((a, b) => a - b) });
    }
    for (const l of merged.values()) {
        if (l.quantity > 99) throw new ApiError('A line can have at most 99.', 400, 'lines');
    }
    return [...merged.values()];
}

export async function resolveLines(storeId: number, input: OrderLineInput[]): Promise<ResolvedLine[]> {
    const lines = mergeLines(input);
    const ids = [...new Set(lines.map((l) => l.menu_item_id))];
    const [items, offered] = await Promise.all([queries.items(storeId, ids), queries.itemAddons(ids)]);
    const itemById = new Map(items.map((i) => [i.id, i]));

    const unavailable: { menu_item_id: number; name: string | null; addon_id?: number }[] = [];
    const resolved: ResolvedLine[] = [];
    for (const l of lines) {
        const item = itemById.get(l.menu_item_id);
        if (!item || !item.is_available) {
            unavailable.push({ menu_item_id: l.menu_item_id, name: item?.name ?? null });
            continue;
        }
        const addons: ResolvedLine['addons'] = [];
        for (const addonId of l.addon_ids) {
            const a = offered.find((o) => o.menu_item_id === l.menu_item_id && o.id === addonId);
            if (!a || !a.is_active || !a.is_available) unavailable.push({ menu_item_id: l.menu_item_id, name: item.name, addon_id: addonId });
            else addons.push({ id: a.id, name: a.name, price: Number(a.price_override ?? a.price) });
        }
        resolved.push({ menu_item_id: item.id, sku: item.sku, name: item.name, unit_price: Number(item.price), kds_station_id: item.kds_station_id, addons, quantity: l.quantity });
    }
    if (unavailable.length) {
        throw new ApiError('Some items are no longer available.', 409, 'lines', { code: 'ITEM_UNAVAILABLE', items: unavailable });
    }
    return resolved;
}

/** A saved order's lines with their snapshot prices (a scanned order keeps them). */
async function savedLines(orderId: number): Promise<(ResolvedLine & { line_total: number })[]> {
    const items = await queries.orderItems(orderId);
    const extras = items.length ? await queries.orderItemAddons(items.map((i) => i.id)) : [];
    return items.map((i) => ({
        menu_item_id: i.menu_item_id,
        sku: i.sku,
        name: i.name,
        unit_price: Number(i.unit_price),
        kds_station_id: i.kds_station_id,
        addons: extras.filter((e) => e.order_item_id === i.id).map((e) => ({ id: e.addon_id, name: e.name, price: Number(e.price) })),
        quantity: i.quantity,
        line_total: Number(i.line_total),
    }));
}

const price = (lines: ResolvedLine[], discount: ResolvedDiscount | null) =>
    priceOrder(
        lines.map((l) => ({ unit_price: l.unit_price, addon_prices: l.addons.map((a) => a.price), quantity: l.quantity })),
        discount?.pricing,
    );

async function insertLines(trx: Trx, orderId: number, lines: ResolvedLine[], priced: PricedOrder) {
    for (const [i, l] of lines.entries()) {
        const p = priced.lines[i];
        const itemId = await queries.insertItem(trx, {
            order_id: orderId,
            menu_item_id: l.menu_item_id,
            kds_station_id: l.kds_station_id,
            sku: l.sku,
            name: l.name,
            unit_price: p.unit_price,
            addons_total: p.addons_total,
            quantity: l.quantity,
            line_total: p.line_total,
        });
        if (l.addons.length) {
            await queries.insertItemAddons(trx, l.addons.map((a) => ({ order_item_id: itemId, addon_id: a.id, name: a.name, price: a.price })));
        }
    }
}

const totals = (priced: PricedOrder) => ({
    item_count: priced.item_count,
    subtotal: priced.subtotal,
    discount_total: priced.discount_total,
    vatable_sales: priced.vatable_sales,
    vat_amount: priced.vat_amount,
    vat_exempt_sales: priced.vat_exempt_sales,
    total_due: priced.total_due,
});

async function saveDiscount(trx: Trx, orderId: number, discount: ResolvedDiscount | null, priced: PricedOrder) {
    if (!discount) return;
    await queries.insertDiscount(trx, {
        order_id: orderId,
        ...discount.record,
        base_amount: priced.discount.base_amount,
        vat_removed: priced.discount.vat_removed,
        amount: priced.discount.amount,
    });
    if (discount.record.voucher_id) await queries.useVoucher(trx, discount.record.voucher_id);
}

/* ── reading ───────────────────────────────────────────────────────────── */

const discountLabel = (d: { kind: string; name: string; rate: unknown; voucher_code: string | null }) =>
    d.kind === 'voucher' ? `Voucher ${d.voucher_code ?? ''}`.trim() : d.kind === 'percent' ? `${d.name} (${Math.round(Number(d.rate) * 100)}%)` : d.name;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getOrder(id: number, storeId: number): Promise<OrderSummary> {
    const o = await queries.order(id);
    if (!o || o.store_id !== storeId) throw new ApiError('Order not found.', 404);
    const [lines, discount, payment] = await Promise.all([savedLines(o.id), queries.orderDiscount(o.id), queries.orderPayment(o.id)]);
    return {
        id: o.id,
        order_no: o.order_no,
        display_no: displayNo(o.order_no),
        status: o.status as OrderStatus,
        source: o.source,
        dining_mode: o.dining_mode,
        payment_method: o.payment_method,
        language: o.language as Language,
        item_count: o.item_count as number,
        subtotal: Number(o.subtotal),
        discount_total: Number(o.discount_total),
        vatable_sales: Number(o.vatable_sales),
        vat_amount: Number(o.vat_amount),
        vat_exempt_sales: Number(o.vat_exempt_sales),
        total_due: Number(o.total_due),
        placed_at: new Date(o.placed_at as unknown as string).toISOString(),
        slip_code: o.slip_token ? slipCode(o.store_code, o.order_number, o.slip_token) : null,
        paid_at: o.paid_at ? new Date(o.paid_at as unknown as string).toISOString() : null,
        discount: discount
            ? {
                  code: discount.code,
                  label: discountLabel(discount),
                  rate: Number(discount.rate),
                  base_amount: Number(discount.base_amount),
                  vat_removed: Number(discount.vat_removed),
                  amount: Number(discount.amount),
                  id_number: discount.id_number,
                  holder_name: discount.holder_name,
              }
            : null,
        payment: payment
            ? { method: payment.method, amount: Number(payment.amount), tendered: num(payment.tendered), change_due: num(payment.change_due), reference_no: payment.reference_no }
            : null,
        lines: lines.map((l) => ({
            sku: l.sku,
            name: l.name,
            quantity: l.quantity,
            unit_price: l.unit_price,
            addons: l.addons.map((a) => ({ name: a.name, price: a.price })),
            line_total: l.line_total,
        })),
    };
}

/* ── placing ───────────────────────────────────────────────────────────── */

export interface PlaceOrderInput {
    storeId: number;
    terminalId: number;
    source: 'kiosk' | 'pos';
    actor: Actor;
    userId?: number | null;
    clientRef: string;
    diningMode: DiningMode;
    language: Language;
    paymentMethod: PaymentMethod;
    lines: OrderLineInput[];
    /** The total the screen showed; a different server total → 409 TOTAL_CHANGED. */
    expectedTotal?: number;
    discount?: ResolvedDiscount | null;
    /** Paid now (cashier walk-in): the order goes straight to the kitchen. */
    payment?: PaymentInput;
    shiftId?: number | null;
    status: OrderStatus;
}

const isDuplicateKey = (e: unknown) => (e as { code?: string })?.code === 'ER_DUP_ENTRY';

export async function placeOrder(input: PlaceOrderInput): Promise<{ order: OrderSummary; created: boolean }> {
    const existing = await queries.byClientRef(input.clientRef);
    if (existing) {
        if (existing.store_id !== input.storeId) throw new ApiError('This order reference is already used.', 409, 'client_ref');
        return { order: await getOrder(existing.id, input.storeId), created: false };
    }

    const lines = await resolveLines(input.storeId, input.lines);
    const discount = input.discount ?? null;
    const priced = price(lines, discount);
    assertMinSpend(discount, priced.subtotal);
    if (input.expectedTotal !== undefined && toCents(input.expectedTotal) !== toCents(priced.total_due)) {
        throw new ApiError('Prices have changed. Please check your order.', 409, 'expected_total', { code: 'TOTAL_CHANGED', total_due: priced.total_due });
    }
    const payment: CheckedPayment | null = input.payment ? checkPayment(input.payment, priced.total_due) : null;
    const paidNow = !!payment;

    let orderId: number;
    try {
        orderId = await queries.transaction(async (trx) => {
            const { order_number, order_no } = await queries.nextOrderNumber(trx, input.storeId);
            const id = await queries.insertOrder(trx, {
                store_id: input.storeId,
                terminal_id: input.terminalId,
                shift_id: input.shiftId ?? null,
                cashier_id: input.source === 'pos' ? (input.userId ?? null) : null,
                client_ref: input.clientRef,
                order_number,
                order_no,
                source: input.source,
                dining_mode: input.diningMode,
                language: input.language,
                status: input.status,
                payment_method: payment?.method ?? input.paymentMethod,
                ...totals(priced),
                // The kiosk slip's barcode code (§7.11): 3 random digits.
                slip_token: input.source === 'kiosk' ? String(randomInt(0, 1000)).padStart(3, '0') : null,
            });
            await insertLines(trx, id, lines, priced);
            await saveDiscount(trx, id, discount, priced);
            if (payment) {
                await queries.markPaid(trx, id, {});
                await queries.recordPayment(trx, { ...payment, order_id: id, shift_id: input.shiftId ?? null, terminal_id: input.terminalId, received_by: input.userId ?? null });
            }
            await queries.logEvent(trx, {
                order_id: id,
                from_status: null,
                to_status: input.status,
                actor_type: input.actor,
                user_id: input.userId ?? null,
                terminal_id: input.terminalId,
                note: paidNow ? `Paid ${payment!.method}` : null,
            });
            return id;
        });
    } catch (e) {
        // Two taps raced past step 1: the second hits the unique client_ref.
        if (isDuplicateKey(e)) {
            const saved = await queries.byClientRef(input.clientRef);
            if (saved && saved.store_id === input.storeId) return { order: await getOrder(saved.id, input.storeId), created: false };
        }
        throw e;
    }
    const order = await getOrder(orderId, input.storeId);
    // Tell the other screens (pipeline/live): a kiosk order now waits at the
    // register's Kiosk # list; a paid walk-in goes to the kitchen.
    if (order.status === 'awaiting_payment') publish(input.storeId, 'order.created', { order_id: order.id, order_no: order.order_no, display_no: order.display_no });
    else await announceSentToKitchen(input.storeId, order.id);
    return { order, created: true };
}

/* ── settling a kiosk order ────────────────────────────────────────────── */

export interface SettleInput {
    storeId: number;
    orderId: number;
    terminalId: number;
    userId: number;
    shiftId: number;
    discount: ResolvedDiscount | null;
    payment: PaymentInput;
    /** The cashier changed the order with the customer (design decision 23). */
    lines?: OrderLineInput[];
}

export async function settleOrder(input: SettleInput): Promise<OrderSummary> {
    const o = await queries.order(input.orderId);
    if (!o || o.store_id !== input.storeId) throw new ApiError('Order not found.', 404);
    if (o.status !== 'awaiting_payment') throw new ApiError(`${o.order_no} is not waiting for payment.`, 409, 'status', { code: 'NOT_AWAITING', status: o.status });
    if (o.locked_by_terminal_id && o.locked_by_terminal_id !== input.terminalId) {
        throw new ApiError(`${o.order_no} is being processed at ${o.locked_by_code ?? 'another register'}.`, 409, 'status', { code: 'IN_USE' });
    }

    const edited = !!input.lines;
    const lines = edited ? await resolveLines(input.storeId, input.lines!) : await savedLines(o.id);
    const priced = price(lines, input.discount);
    assertMinSpend(input.discount, priced.subtotal);
    const payment = checkPayment(input.payment, priced.total_due);

    await queries.transaction(async (trx) => {
        // First: only one register can win (409 if it is no longer awaiting payment).
        await queries.moveStatus(trx, {
            order_id: o.id,
            from_status: 'awaiting_payment',
            to_status: 'preparing',
            actor_type: 'cashier',
            user_id: input.userId,
            terminal_id: input.terminalId,
            note: `Paid ${payment.method}`,
        });
        if (edited) {
            await queries.deleteItems(trx, o.id);
            await insertLines(trx, o.id, lines, priced);
            await queries.logEvent(trx, { order_id: o.id, event_type: 'edited', from_status: null, to_status: null, actor_type: 'cashier', user_id: input.userId, terminal_id: input.terminalId });
        }
        await queries.markPaid(trx, o.id, { ...totals(priced), shift_id: input.shiftId, cashier_id: input.userId, payment_method: payment.method });
        await saveDiscount(trx, o.id, input.discount, priced);
        await queries.recordPayment(trx, { ...payment, order_id: o.id, shift_id: input.shiftId, terminal_id: input.terminalId, received_by: input.userId });
    });
    await announceSentToKitchen(input.storeId, o.id);
    return getOrder(o.id, input.storeId);
}
