import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { changePct, closeShift, itemsText, queries, sharePercents, shiftCsv, summarize, type OrderRow, type PaymentRow } from '../pipeline/reports';

// pipeline/reports — Shift Sales & Z-Reading (design §5.7, §7.9).

const original = { ...queries };
const stub = (name: keyof typeof queries, impl: (...a: any[]) => any) => ((queries as any)[name] = async (...a: any[]) => impl(...a));
afterEach(() => Object.assign(queries, original));

const order = (id: number, o: Partial<OrderRow>): OrderRow => ({
    id,
    order_no: `ORD-${String(id).padStart(6, '0')}`,
    source: 'pos',
    dining_mode: 'IN',
    status: 'completed',
    item_count: 2,
    subtotal: '0.00',
    vatable_sales: '0.00',
    vat_amount: '0.00',
    vat_exempt_sales: '0.00',
    total_due: '0.00',
    paid_at: new Date('2026-11-26T03:00:00Z'),
    ...o,
});

// Design examples A (₱910 GCash), B (Student ₱306 cash), C (Senior ₱242.86 GCash), plus one voided card order.
const ORDERS = [
    order(1, { dining_mode: 'IN', item_count: 8, subtotal: '910.00', vatable_sales: '812.50', vat_amount: '97.50', total_due: '910.00' }),
    order(2, { dining_mode: 'OUT', item_count: 2, subtotal: '340.00', vatable_sales: '273.21', vat_amount: '32.79', total_due: '306.00' }),
    order(3, { dining_mode: 'IN', item_count: 2, subtotal: '340.00', vatable_sales: '0.00', vat_amount: '0.00', vat_exempt_sales: '242.86', total_due: '242.86' }),
    order(4, { dining_mode: 'OUT', item_count: 1, subtotal: '165.00', total_due: '165.00', status: 'voided' }),
];
const PAYMENTS: PaymentRow[] = [
    { order_id: 1, method: 'gcash', amount: '910.00', status: 'settled' },
    { order_id: 2, method: 'cash', amount: '306.00', status: 'settled' },
    { order_id: 3, method: 'gcash', amount: '242.86', status: 'settled' },
    { order_id: 4, method: 'cash', amount: '165.00', status: 'refunded' },
];
const LINES = [
    { order_id: 2, name: 'Double Smash Burger', quantity: 1 },
    { order_id: 2, name: 'Smoky Bacon Melt', quantity: 1 },
];

describe('pipeline/reports', () => {
    test('headline = money collected after discounts, voids left out (decision 18)', () => {
        const f = summarize(ORDERS, PAYMENTS, LINES, 2000, null);
        assert.equal(f.gross_sales, 1458.86);
        assert.equal(f.transactions, 3);
        assert.equal(f.in_count, 2);
        assert.equal(f.out_count, 1);
        assert.equal(f.items_sold, 12);
        assert.equal(f.average_ticket, 486.29); // 1458.86 ÷ 3
        assert.equal(f.items_per_order, 4);
        assert.equal(f.subtotal, 1590);
        assert.equal(f.discount_total, 131.14); // 1590 − 1458.86
        assert.equal(f.vat_exempt_sales, 242.86);
        assert.deepEqual(f.voids, { count: 1, amount: 165 });
        assert.equal(f.refunds_amount, 165);
        assert.equal(f.first_order_no, 'ORD-000001');
        assert.equal(f.last_order_no, 'ORD-000004');
    });

    test('tender reconciliation equals the headline, shares add up to 100', () => {
        const f = summarize(ORDERS, PAYMENTS, LINES, 2000, null);
        assert.deepEqual(f.tenders, [
            { method: 'gcash', total: 1152.86, share_pct: 79 },
            { method: 'cash', total: 306, share_pct: 21 },
            { method: 'card', total: 0, share_pct: 0 },
        ]);
        assert.equal(f.tenders.reduce((a, t) => a + t.total, 0), f.gross_sales);
    });

    test('expected cash = opening + cash taken − cash refunded; over / short from the count', () => {
        const f = summarize(ORDERS, PAYMENTS, LINES, 2000, 2300);
        assert.deepEqual(f.cash, { opening: 2000, sales: 471, refunds: 165, expected: 2306, counted: 2300, over_short: -6 });
    });

    test('audit log: newest first, items as "1x Name", VOID rows kept', () => {
        const f = summarize(ORDERS, PAYMENTS, LINES, 0, null);
        assert.deepEqual(
            f.audit.map((a) => [a.order_no, a.status, a.method]),
            [
                ['ORD-000004', 'voided', 'cash'],
                ['ORD-000003', 'completed', 'gcash'],
                ['ORD-000002', 'completed', 'cash'],
                ['ORD-000001', 'completed', 'gcash'],
            ],
        );
        assert.equal(f.audit[2].items, '1x Double Smash Burger, 1x Smoky Bacon Melt');
    });

    test('an empty shift is all zeros', () => {
        const f = summarize([], [], [], 1500, null);
        assert.equal(f.gross_sales, 0);
        assert.equal(f.average_ticket, 0);
        assert.equal(f.cash.expected, 1500);
        assert.deepEqual(f.tenders.map((t) => t.share_pct), [0, 0, 0]);
    });

    test('shares, vs yesterday, items text', () => {
        assert.deepEqual(sharePercents([948480, 355680, 177840]), [64, 24, 12]); // the mock-up's tenders
        assert.deepEqual(sharePercents([1, 1, 1]), [34, 33, 33]);
        assert.equal(changePct(14820, 13185), 12.4);
        assert.equal(changePct(100, 0), null);
        assert.equal(itemsText([{ order_id: 1, name: 'Sundae', quantity: 2 }]), '2x Sundae');
    });

    const SHIFT = { id: 1, store_id: 1, terminal_id: 2, cashier_id: 3, status: 'open', opened_at: new Date('2026-11-26T01:00:00Z'), closed_at: null, opening_cash: '2000.00', counted_cash: null, terminal_code: 'POS-01', cashier_name: 'Cashier One' };

    test('close shift: next Z number, running grand total, expected / over-short saved', async () => {
        const saved: any = {};
        stub('shift', () => SHIFT);
        stub('paidOrders', () => ORDERS);
        stub('payments', () => PAYMENTS);
        stub('transaction', (fn: any) => fn('trx'));
        stub('closeShift', (_t: any, id: number, v: any) => ((saved.close = [id, v]), 1));
        stub('lastZ', () => ({ z_number: 6, grand_total_end: '100000.00' }));
        stub('insertZ', (_t: any, row: any) => (saved.z = row));
        // readReport afterwards
        stub('lines', () => LINES);
        stub('todayVsYesterday', () => ({ today: '1458.86', yesterday: null }));
        stub('zReading', () => ({ id: 9, z_number: 7, generated_at: new Date(), grand_total_start: '100000.00', grand_total_end: '101458.86', generated_by: 'Cashier One' }));

        const report = await closeShift({ shiftId: 1, storeId: 1, countedCash: 2300, userId: 3 });
        assert.deepEqual(saved.close, [1, { expected: 2306, counted: 2300, overShort: -6 }]);
        assert.equal(saved.z.z_number, 7);
        assert.equal(saved.z.grand_total_start, 100000);
        assert.equal(saved.z.grand_total_end, 101458.86);
        assert.equal(saved.z.net_sales, 1458.86);
        assert.equal(saved.z.gross_sales, 1590);
        assert.equal(saved.z.cash_total, 306);
        assert.equal(saved.z.gcash_total, 1152.86);
        assert.equal(saved.z.voids_count, 1);
        assert.equal(saved.z.generated_by, 3);
        assert.equal(report.z_reading?.z_number, 7);
        assert.equal(report.vs_yesterday_pct, null);
    });

    test('close shift: already closed, closed meanwhile (409), another store (404)', async () => {
        stub('shift', () => ({ ...SHIFT, status: 'closed' }));
        await assert.rejects(closeShift({ shiftId: 1, storeId: 1, countedCash: 0, userId: 3 }), (e: any) => e.statusCode === 409 && e.value.code === 'SHIFT_CLOSED');
        stub('shift', () => SHIFT);
        stub('paidOrders', () => []);
        stub('payments', () => []);
        stub('transaction', (fn: any) => fn('trx'));
        stub('closeShift', () => 0);
        await assert.rejects(closeShift({ shiftId: 1, storeId: 1, countedCash: 0, userId: 3 }), (e: any) => e.statusCode === 409);
        await assert.rejects(closeShift({ shiftId: 1, storeId: 2, countedCash: 0, userId: 3 }), (e: any) => e.statusCode === 404);
    });

    test('CSV: one row per order (VOID marked), commas quoted, totals at the end', async () => {
        stub('paidOrders', () => [ORDERS[1], { ...ORDERS[3], discount_name: null }]);
        stub('payments', () => [{ ...PAYMENTS[1], reference_no: null }, PAYMENTS[3]]);
        stub('lines', () => LINES);
        const report: any = {
            shift: { id: 1, terminal_code: 'POS-01', cashier_name: 'Cashier One', opened_at: '2026-11-26T01:00:00Z', closed_at: null },
            ...summarize([ORDERS[1], ORDERS[3]], PAYMENTS, LINES, 2000, null),
            z_reading: null,
        };
        const csv = await shiftCsv(report);
        const rows = csv.trim().split('\r\n');
        assert.match(rows[0], /^Order No,Paid At,Source,Mode,Items,/);
        assert.match(rows[1], /^ORD-000002,.*,POS,OUT,"1x Double Smash Burger, 1x Smoky Bacon Melt",340\.00,34\.00,.*,306\.00,Cash,,Paid$/);
        assert.match(rows[2], /,VOID$/);
        assert.ok(rows.some((r) => r.startsWith('Gross shift sales,306.00')));
        assert.ok(rows.some((r) => r.startsWith('Z-Reading,not closed yet')));
    });
});
