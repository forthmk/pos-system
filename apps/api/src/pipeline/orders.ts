import { randomInt } from 'node:crypto';
import type { Insertable, Transaction } from 'kysely';
import type { DiningMode, Language, OrderLineInput, OrderSummary, PaymentMethod } from '@pos-system/shared';
import ApiError from '../apiError';
import type { DB, OrderItemAddons, OrderItems, Orders } from '../config/database/types.gen';
import { db } from '../services/database.service';
import { displayNo, nextOrderNumber } from './numbering';
import { priceOrder, toCents, type Discount } from './pricing';
import { logEvent, type Actor, type OrderStatus } from './status';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · orders — saving and reading orders for every screen
 * (design §5.8 / §7, "Server — processing an order"):
 *
 *   1. same client_ref already saved?  → return that order (no duplicates)
 *   2. merge identical lines (item + same extras), load them from the menu:
 *      active, available, extras offered for that item?  else 409
 *   3. price with pipeline/pricing (screen prices are never used)
 *   4. differs from what the screen showed?            → 409 TOTAL_CHANGED
 *   5. one transaction: order number, order, lines, extras (names / prices
 *      copied), first status event
 *
 * SQL sits in `queries` so tests can swap it.
 * ────────────────────────────────────────────────────────────────────────── */

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
    order: (id: number) => db.selectFrom('orders').selectAll().where('id', '=', id).executeTakeFirst(),
    orderItems: (orderId: number) =>
        db
            .selectFrom('order_items')
            .select(['id', 'sku', 'name', 'quantity', 'unit_price', 'addons_total', 'line_total'])
            .where('order_id', '=', orderId)
            .orderBy('id')
            .execute(),
    orderItemAddons: (orderItemIds: number[]) =>
        db.selectFrom('order_item_addons').select(['order_item_id', 'name', 'price']).where('order_item_id', 'in', orderItemIds).orderBy('id').execute(),
    transaction: <T>(fn: (trx: Transaction<DB>) => Promise<T>) => db.transaction().execute(fn),
    nextOrderNumber: (trx: Transaction<DB>, storeId: number) => nextOrderNumber(trx, storeId),
    insertOrder: async (trx: Transaction<DB>, values: Insertable<Orders>) =>
        Number((await trx.insertInto('orders').values(values).executeTakeFirstOrThrow()).insertId),
    insertItem: async (trx: Transaction<DB>, values: Insertable<OrderItems>) =>
        Number((await trx.insertInto('order_items').values(values).executeTakeFirstOrThrow()).insertId),
    insertItemAddons: (trx: Transaction<DB>, rows: Insertable<OrderItemAddons>[]) => trx.insertInto('order_item_addons').values(rows).execute(),
    logEvent: (trx: Transaction<DB>, e: Parameters<typeof logEvent>[1]) => logEvent(trx, e),
};

/* ── 2. lines ──────────────────────────────────────────────────────────── */

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
        resolved.push({
            menu_item_id: item.id,
            sku: item.sku,
            name: item.name,
            unit_price: Number(item.price),
            kds_station_id: item.kds_station_id,
            addons,
            quantity: l.quantity,
        });
    }
    if (unavailable.length) {
        throw new ApiError('Some items are no longer available.', 409, 'lines', { code: 'ITEM_UNAVAILABLE', items: unavailable });
    }
    return resolved;
}

/* ── reading ───────────────────────────────────────────────────────────── */

export async function getOrder(id: number, storeId: number): Promise<OrderSummary> {
    const o = await queries.order(id);
    if (!o || o.store_id !== storeId) throw new ApiError('Order not found.', 404);
    const items = await queries.orderItems(o.id);
    const extras = items.length ? await queries.orderItemAddons(items.map((i) => i.id)) : [];
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
        lines: items.map((i) => ({
            sku: i.sku,
            name: i.name,
            quantity: i.quantity,
            unit_price: Number(i.unit_price),
            addons: extras.filter((e) => e.order_item_id === i.id).map((e) => ({ name: e.name, price: Number(e.price) })),
            line_total: Number(i.line_total),
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
    discount?: Discount;
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
    const priced = priceOrder(
        lines.map((l) => ({ unit_price: l.unit_price, addon_prices: l.addons.map((a) => a.price), quantity: l.quantity })),
        input.discount,
    );
    if (input.expectedTotal !== undefined && toCents(input.expectedTotal) !== toCents(priced.total_due)) {
        throw new ApiError('Prices have changed. Please check your order.', 409, 'expected_total', { code: 'TOTAL_CHANGED', total_due: priced.total_due });
    }

    let orderId: number;
    try {
        orderId = await queries.transaction(async (trx) => {
            const { order_number, order_no } = await queries.nextOrderNumber(trx, input.storeId);
            const id = await queries.insertOrder(trx, {
                store_id: input.storeId,
                terminal_id: input.terminalId,
                cashier_id: input.source === 'pos' ? (input.userId ?? null) : null,
                client_ref: input.clientRef,
                order_number,
                order_no,
                source: input.source,
                dining_mode: input.diningMode,
                language: input.language,
                status: input.status,
                payment_method: input.paymentMethod,
                item_count: priced.item_count,
                subtotal: priced.subtotal,
                discount_total: priced.discount_total,
                vatable_sales: priced.vatable_sales,
                vat_amount: priced.vat_amount,
                vat_exempt_sales: priced.vat_exempt_sales,
                total_due: priced.total_due,
                // The kiosk slip's barcode code (§7.11): 3 random digits.
                slip_token: input.source === 'kiosk' ? String(randomInt(0, 1000)).padStart(3, '0') : null,
            });
            for (const [i, l] of lines.entries()) {
                const p = priced.lines[i];
                const itemId = await queries.insertItem(trx, {
                    order_id: id,
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
                    await queries.insertItemAddons(
                        trx,
                        l.addons.map((a) => ({ order_item_id: itemId, addon_id: a.id, name: a.name, price: a.price })),
                    );
                }
            }
            await queries.logEvent(trx, {
                order_id: id,
                from_status: null,
                to_status: input.status,
                actor_type: input.actor,
                user_id: input.userId ?? null,
                terminal_id: input.terminalId,
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
    return { order: await getOrder(orderId, input.storeId), created: true };
}
