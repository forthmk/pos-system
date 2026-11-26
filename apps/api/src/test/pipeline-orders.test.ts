import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// pipeline/orders (design §5.8 / §7): check → merge → price → save, no duplicates.

const orders: Record<string, any> = require('../pipeline/orders');
const original = { ...orders.queries };
let calls: Record<string, any[]> = {};
const stub = (name: string, impl: (...a: any[]) => any) => {
    orders.queries[name] = async (...args: any[]) => {
        (calls[name] ??= []).push(args);
        return impl(...args);
    };
};

const MENU = [
    { id: 9, sku: 'D1', name: 'Golden Crispy Fries', price: '65.00', is_available: 1, kds_station_id: 1 },
    { id: 8, sku: 'B5', name: 'Spicy Burger', price: '150.00', is_available: 1, kds_station_id: 1 },
    { id: 15, sku: 'R1', name: 'Iced Cola Fizz', price: '45.00', is_available: 1, kds_station_id: 1 },
];
const OFFERED = [
    { menu_item_id: 8, id: 1, name: 'Crispy Fries (S)', price: '35.00', price_override: null, is_available: 1, is_active: 1 },
    { menu_item_id: 15, id: 1, name: 'Crispy Fries (S)', price: '35.00', price_override: null, is_available: 1, is_active: 1 },
    { menu_item_id: 15, id: 2, name: 'Mini Swirl Sundae', price: '45.00', price_override: null, is_available: 0, is_active: 1 },
];
const CART = [
    { menu_item_id: 9, quantity: 3, addon_ids: [] },
    { menu_item_id: 8, quantity: 3, addon_ids: [1] },
    { menu_item_id: 15, quantity: 2, addon_ids: [1] },
];
const input = (over: Record<string, unknown> = {}) => ({
    storeId: 1,
    terminalId: 1,
    source: 'kiosk',
    actor: 'kiosk',
    clientRef: '8f0c2c4e-6a51-4c1e-9d55-2b1f0e7a9c11',
    diningMode: 'IN',
    language: 'en',
    paymentMethod: 'gcash',
    lines: CART,
    expectedTotal: 910,
    status: 'awaiting_payment',
    ...over,
});

let saved: { order?: any; items: any[]; addons: any[]; events: any[]; discounts: any[]; payments: any[]; paid: any[]; moves: any[]; deleted: number[] };
beforeEach(() => {
    Object.assign(orders.queries, original);
    calls = {};
    saved = { items: [], addons: [], events: [], discounts: [], payments: [], paid: [], moves: [], deleted: [] };
    stub('items', (_s: number, ids: number[]) => MENU.filter((m) => ids.includes(m.id)));
    stub('itemAddons', () => OFFERED);
    stub('byClientRef', () => undefined);
    stub('transaction', (fn: any) => fn('trx'));
    stub('nextOrderNumber', () => ({ order_number: 748, order_no: 'ORD-000748' }));
    stub('insertOrder', (_t: any, v: any) => {
        saved.order = v;
        return 1748;
    });
    stub('insertItem', (_t: any, v: any) => {
        saved.items.push(v);
        return 100 + saved.items.length;
    });
    stub('insertItemAddons', (_t: any, rows: any[]) => saved.addons.push(...rows));
    stub('logEvent', (_t: any, e: any) => saved.events.push(e));
    stub('order', () => ({ id: 1748, store_id: 1, order_no: 'ORD-000748', status: 'awaiting_payment', source: 'kiosk', dining_mode: 'IN', payment_method: 'gcash', language: 'en', item_count: 8, subtotal: '910.00', discount_total: '0.00', vatable_sales: '812.50', vat_amount: '97.50', vat_exempt_sales: '0.00', total_due: '910.00', placed_at: new Date('2026-11-26T10:13:04Z') }));
    stub('orderItems', () => [{ id: 101, menu_item_id: 9, kds_station_id: 1, sku: 'D1', name: 'Golden Crispy Fries', quantity: 3, unit_price: '65.00', addons_total: '0.00', line_total: '195.00' }]);
    stub('orderItemAddons', () => []);
    stub('orderDiscount', () => undefined);
    stub('orderPayment', () => undefined);
    stub('insertDiscount', (_t: any, row: any) => saved.discounts.push(row));
    stub('useVoucher', () => undefined);
    stub('markPaid', (_t: any, id: number, v: any) => saved.paid.push([id, v]));
    stub('recordPayment', (_t: any, p: any) => saved.payments.push(p));
    stub('moveStatus', (_t: any, e: any) => saved.moves.push(e));
    stub('deleteItems', (_t: any, id: number) => saved.deleted.push(id));
});

const status = (code: number) => (err: any) => err.statusCode === code;

describe('pipeline/orders · mergeLines', () => {
    test('same item + same extras (any order) become one line', () => {
        const merged = orders.mergeLines([
            { menu_item_id: 8, quantity: 1, addon_ids: [2, 1] },
            { menu_item_id: 8, quantity: 2, addon_ids: [1, 2] },
            { menu_item_id: 8, quantity: 1, addon_ids: [] },
        ]);
        assert.deepEqual(merged, [
            { menu_item_id: 8, quantity: 3, addon_ids: [1, 2] },
            { menu_item_id: 8, quantity: 1, addon_ids: [] },
        ]);
    });

    test('a merged line over 99 is refused (400)', () => {
        assert.throws(() => orders.mergeLines([{ menu_item_id: 8, quantity: 60, addon_ids: [] }, { menu_item_id: 8, quantity: 40, addon_ids: [] }]), status(400));
    });
});

describe('pipeline/orders · placeOrder', () => {
    test('the mock-up cart is priced by the server and saved with snapshots', async () => {
        const { created, order } = await orders.placeOrder(input());
        assert.equal(created, true);
        assert.equal(order.order_no, 'ORD-000748');
        assert.equal(order.display_no, '000748');
        assert.equal(saved.order.order_no, 'ORD-000748');
        assert.equal(saved.order.item_count, 8);
        assert.equal(saved.order.subtotal, 910);
        assert.equal(saved.order.vat_amount, 97.5);
        assert.equal(saved.order.total_due, 910);
        assert.equal(saved.order.status, 'awaiting_payment');
        assert.match(saved.order.slip_token, /^\d{3}$/);
        assert.deepEqual(
            saved.items.map((i) => [i.sku, i.name, i.unit_price, i.addons_total, i.quantity, i.line_total]),
            [
                ['D1', 'Golden Crispy Fries', 65, 0, 3, 195],
                ['B5', 'Spicy Burger', 150, 35, 3, 555],
                ['R1', 'Iced Cola Fizz', 45, 35, 2, 160],
            ],
        );
        assert.deepEqual(saved.addons, [
            { order_item_id: 102, addon_id: 1, name: 'Crispy Fries (S)', price: 35 },
            { order_item_id: 103, addon_id: 1, name: 'Crispy Fries (S)', price: 35 },
        ]);
        assert.deepEqual(saved.events[0], { order_id: 1748, from_status: null, to_status: 'awaiting_payment', actor_type: 'kiosk', user_id: null, terminal_id: 1, note: null });
    });

    test('a retried tap (same client_ref) returns the saved order and writes nothing', async () => {
        stub('byClientRef', () => ({ id: 1748, store_id: 1 }));
        const { created, order } = await orders.placeOrder(input());
        assert.equal(created, false);
        assert.equal(order.id, 1748);
        assert.equal(calls.transaction, undefined);
    });

    test('a sold-out item → 409 ITEM_UNAVAILABLE naming it; nothing saved', async () => {
        stub('items', () => MENU.filter((m) => m.id !== 9));
        await assert.rejects(orders.placeOrder(input()), (e: any) => e.statusCode === 409 && e.value.code === 'ITEM_UNAVAILABLE' && e.value.items[0].menu_item_id === 9);
        assert.equal(calls.transaction, undefined);
    });

    test('a sold-out extra, or an extra the item does not offer → 409', async () => {
        await assert.rejects(orders.placeOrder(input({ lines: [{ menu_item_id: 15, quantity: 1, addon_ids: [2] }], expectedTotal: 90 })), (e: any) => e.value?.items[0].addon_id === 2);
        await assert.rejects(orders.placeOrder(input({ lines: [{ menu_item_id: 9, quantity: 1, addon_ids: [1] }], expectedTotal: 100 })), status(409));
    });

    test('the screen showed another total → 409 TOTAL_CHANGED with the server total', async () => {
        await assert.rejects(orders.placeOrder(input({ expectedTotal: 900 })), (e: any) => e.statusCode === 409 && e.value.code === 'TOTAL_CHANGED' && e.value.total_due === 910);
        assert.equal(calls.transaction, undefined);
    });

    test('two taps racing: the duplicate key returns the first order', async () => {
        let first = true;
        stub('byClientRef', () => {
            if (first) {
                first = false;
                return undefined;
            }
            return { id: 1748, store_id: 1 };
        });
        stub('transaction', () => {
            throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
        });
        const { created, order } = await orders.placeOrder(input());
        assert.equal(created, false);
        assert.equal(order.id, 1748);
    });

    test('another store’s order is 404', async () => {
        await assert.rejects(orders.getOrder(1748, 2), status(404));
    });
});

const student = { pricing: { kind: 'percent', rate: 0.1 }, label: 'Student (10%)', record: { discount_type_id: 4, voucher_id: null, rate: 0.1, id_number: null, holder_name: null, diners: 1, qualified: 1 }, minSpend: 0 };

describe('pipeline/orders · cashier walk-in (paid now)', () => {
    const walkIn = (over: Record<string, unknown> = {}) =>
        input({ source: 'pos', actor: 'cashier', userId: 3, shiftId: 5, terminalId: 2, status: 'preparing', expectedTotal: undefined, paymentMethod: 'cash', ...over });

    test('Student 10% + cash 1000: discount row, payment with change, paid + sent to the kitchen', async () => {
        await orders.placeOrder(walkIn({ discount: student, payment: { method: 'cash', tendered: 1000 } }));
        assert.equal(saved.order.status, 'preparing');
        assert.equal(saved.order.shift_id, 5);
        assert.equal(saved.order.cashier_id, 3);
        assert.equal(saved.order.slip_token, null);
        assert.equal(saved.order.subtotal, 910);
        assert.equal(saved.order.discount_total, 91);
        assert.equal(saved.order.total_due, 819);
        assert.deepEqual(saved.discounts[0], { order_id: 1748, ...student.record, base_amount: 910, vat_removed: 0, amount: 91 });
        assert.deepEqual(saved.payments[0], { method: 'cash', amount: 819, tendered: 1000, change_due: 181, reference_no: null, order_id: 1748, shift_id: 5, terminal_id: 2, received_by: 3 });
        assert.equal(saved.paid[0][0], 1748);
        assert.equal(saved.events[0].note, 'Paid cash');
    });

    test('cash short → 422 before anything is saved', async () => {
        await assert.rejects(orders.placeOrder(walkIn({ payment: { method: 'cash', tendered: 500 } })), (e: any) => e.statusCode === 422 && e.value.code === 'INSUFFICIENT_CASH');
        assert.equal(calls.transaction, undefined);
    });

    test('GCash needs a reference number (400); with one it is saved', async () => {
        await assert.rejects(orders.placeOrder(walkIn({ payment: { method: 'gcash' } })), status(400));
        await orders.placeOrder(walkIn({ payment: { method: 'gcash', reference_no: '5012 345 678' } }));
        assert.equal(saved.payments[0].reference_no, '5012 345 678');
        assert.equal(saved.order.payment_method, 'gcash');
    });

    test('a voucher under its minimum spend → 409 VOUCHER_INVALID', async () => {
        const voucher = { ...student, label: 'Voucher BIG', minSpend: 1000 };
        await assert.rejects(orders.placeOrder(walkIn({ discount: voucher, payment: { method: 'cash', tendered: 1000 } })), (e: any) => e.value?.code === 'VOUCHER_INVALID');
    });
});

describe('pipeline/orders · settleOrder (scanned kiosk order)', () => {
    const awaitingRow = { id: 1748, store_id: 1, order_no: 'ORD-000748', status: 'awaiting_payment', locked_by_terminal_id: 2, locked_by_code: 'POS-01', order_number: 748 };
    const settle = (over: Record<string, unknown> = {}) =>
        orders.settleOrder({ storeId: 1, orderId: 1748, terminalId: 2, userId: 3, shiftId: 5, discount: null, payment: { method: 'cash', tendered: 200 }, ...over });

    test('keeps the kiosk prices, moves awaiting → preparing first, saves payment', async () => {
        stub('order', () => ({ ...awaitingRow, placed_at: new Date(), slip_token: '527', store_code: '01', paid_at: null, source: 'kiosk', dining_mode: 'IN', payment_method: 'cash', language: 'en', item_count: 3, subtotal: '195', discount_total: '0', vatable_sales: '0', vat_amount: '0', vat_exempt_sales: '0', total_due: '195' }));
        await settle();
        assert.deepEqual([saved.moves[0].from_status, saved.moves[0].to_status, saved.moves[0].actor_type], ['awaiting_payment', 'preparing', 'cashier']);
        assert.equal(calls.items, undefined); // today's menu not read: kiosk prices kept
        assert.equal(saved.paid[0][1].total_due, 195);
        assert.equal(saved.paid[0][1].shift_id, 5);
        assert.equal(saved.payments[0].change_due, 5);
        assert.equal(saved.deleted.length, 0);
    });

    test('changed lines are priced from today’s menu, replaced, and logged as edited', async () => {
        stub('order', () => ({ ...awaitingRow, placed_at: new Date(), slip_token: '527', store_code: '01', paid_at: null, source: 'kiosk', dining_mode: 'IN', payment_method: 'cash', language: 'en', item_count: 1, subtotal: '65', discount_total: '0', vatable_sales: '0', vat_amount: '0', vat_exempt_sales: '0', total_due: '65' }));
        await settle({ lines: [{ menu_item_id: 15, quantity: 2, addon_ids: [] }], payment: { method: 'cash', tendered: 100 } });
        assert.deepEqual(saved.deleted, [1748]);
        assert.equal(saved.items[0].sku, 'R1');
        assert.equal(saved.paid[0][1].total_due, 90);
        assert.ok(saved.events.some((e) => e.event_type === 'edited'));
    });

    test('not awaiting payment, or held by another register → 409; nothing saved', async () => {
        stub('order', () => ({ ...awaitingRow, status: 'preparing' }));
        await assert.rejects(settle(), (e: any) => e.statusCode === 409 && e.value.code === 'NOT_AWAITING');
        stub('order', () => ({ ...awaitingRow, locked_by_terminal_id: 9, locked_by_code: 'POS-02' }));
        await assert.rejects(settle(), (e: any) => e.statusCode === 409 && e.value.code === 'IN_USE');
        assert.equal(calls.transaction, undefined);
    });
});
