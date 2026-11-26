import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { clearServed, completeOrder, queries, readBoard, readStats, readTickets, recallOrder } from '../pipeline/kitchen';
import { join, resetLive } from '../pipeline/live';

// pipeline/kitchen — the kitchen display and the Orders board (design §5.5–5.6, §7.8).

const original = { ...queries };
const stub = (name: keyof typeof queries, impl: (...a: any[]) => any) => ((queries as any)[name] = async (...a: any[]) => impl(...a));
afterEach(() => {
    Object.assign(queries, original);
    resetLive();
});

const ORDERS = [
    { id: 1, order_no: 'ORD-000748', source: 'kiosk', dining_mode: 'IN', table_no: null, status: 'preparing', sent_to_kitchen_at: new Date('2026-11-26T10:00:00Z'), completed_at: null },
    { id: 2, order_no: 'ORD-000749', source: 'pos', dining_mode: 'OUT', table_no: null, status: 'completed', sent_to_kitchen_at: new Date('2026-11-26T10:01:00Z'), completed_at: new Date('2026-11-26T10:06:00Z') },
    { id: 3, order_no: 'ORD-000750', source: 'pos', dining_mode: 'IN', table_no: null, status: 'preparing', sent_to_kitchen_at: new Date('2026-11-26T10:02:00Z'), completed_at: null },
];
const LINES = [
    { id: 11, order_id: 1, kds_station_id: 1, name: 'Classic Burger', quantity: 2, unit_price: '120.00' },
    { id: 12, order_id: 1, kds_station_id: null, name: 'Iced Tea', quantity: 1 },
    { id: 21, order_id: 2, kds_station_id: 1, name: 'Golden Crispy Fries', quantity: 3 },
    { id: 31, order_id: 3, kds_station_id: 2, name: 'Halo-Halo', quantity: 1 },
];

describe('pipeline/kitchen', () => {
    test('tickets: no prices, extras under their line, oldest first', async () => {
        stub('openOrders', () => ORDERS);
        stub('lines', () => LINES);
        stub('extras', () => [{ order_item_id: 11, name: 'Extra Cheese' }]);
        const tickets = await readTickets(1, null);
        assert.deepEqual(
            tickets.map((t) => t.display_no),
            ['000748', '000749', '000750'],
        );
        assert.deepEqual(tickets[0].lines, [
            { quantity: 2, name: 'Classic Burger', extras: ['Extra Cheese'] },
            { quantity: 1, name: 'Iced Tea', extras: [] },
        ]);
        assert.equal(tickets[0].sent_to_kitchen_at, '2026-11-26T10:00:00.000Z');
        assert.equal(tickets[1].completed_at, '2026-11-26T10:06:00.000Z');
        assert.ok(!('unit_price' in tickets[0].lines[0]));
    });

    test('a station sees its own lines and lines with no station; orders with nothing for it are left out', async () => {
        stub('openOrders', () => ORDERS);
        stub('lines', () => LINES);
        stub('extras', () => []);
        const tickets = await readTickets(1, 1);
        assert.deepEqual(
            tickets.map((t) => t.order_id),
            [1, 2],
        );
        assert.equal(tickets[0].lines.length, 2);
    });

    test('stats: pending from the tickets, completed + average prep from today', async () => {
        stub('today', () => ({ completed: 4, avg_prep: '287.5000' }));
        const stats = await readStats(1, [{ status: 'preparing' }, { status: 'completed' }, { status: 'preparing' }] as any);
        assert.deepEqual(stats, { pending: 2, completed: 4, avg_prep_seconds: 288 });
        stub('today', () => ({ completed: 0, avg_prep: null }));
        assert.equal((await readStats(1, [])).avg_prep_seconds, null);
    });

    test('complete: preparing → completed as the chef', async () => {
        const moves: any[] = [];
        stub('order', () => ({ id: 1, store_id: 1, order_no: 'ORD-000748', status: 'preparing', cleared_at: null, completed_ago: null }));
        stub('transaction', (fn: any) => fn('trx'));
        stub('moveStatus', (_t: any, e: any) => moves.push(e));
        const done = await completeOrder({ storeId: 1, orderId: 1, actor: 'chef', terminalId: 3 });
        assert.deepEqual(done, { order_id: 1, order_no: 'ORD-000748', display_no: '000748' });
        assert.equal(moves[0].from_status, 'preparing');
        assert.equal(moves[0].to_status, 'completed');
        assert.equal(moves[0].actor_type, 'chef');
        assert.equal(moves[0].terminal_id, 3);
    });

    test('complete: not preparing → 409; another store → 404', async () => {
        stub('order', () => ({ id: 1, store_id: 1, order_no: 'ORD-000748', status: 'completed', cleared_at: null, completed_ago: 30 }));
        await assert.rejects(completeOrder({ storeId: 1, orderId: 1, actor: 'chef' }), (e: any) => e.statusCode === 409 && e.value.code === 'NOT_PREPARING');
        await assert.rejects(completeOrder({ storeId: 2, orderId: 1, actor: 'chef' }), (e: any) => e.statusCode === 404);
    });

    test('recall: within kds_recall_minutes → preparing and completed_at cleared', async () => {
        const moves: any[] = [];
        const cleared: number[] = [];
        stub('order', () => ({ id: 2, store_id: 1, order_no: 'ORD-000749', status: 'completed', cleared_at: null, completed_ago: 9 * 60 }));
        stub('settings', () => [{ key: 'kds_recall_minutes', value: '10' }]);
        stub('transaction', (fn: any) => fn('trx'));
        stub('moveStatus', (_t: any, e: any) => moves.push(e));
        stub('clearCompletedAt', (_t: any, id: number) => cleared.push(id));
        await recallOrder({ storeId: 1, orderId: 2, actor: 'chef' });
        assert.equal(moves[0].from_status, 'completed');
        assert.equal(moves[0].to_status, 'preparing');
        assert.deepEqual(cleared, [2]);
    });

    test('recall: too late, or already served → 409 RECALL_EXPIRED', async () => {
        stub('settings', () => [{ key: 'kds_recall_minutes', value: '10' }]);
        stub('order', () => ({ id: 2, store_id: 1, order_no: 'ORD-000749', status: 'completed', cleared_at: null, completed_ago: 10 * 60 + 1 }));
        await assert.rejects(recallOrder({ storeId: 1, orderId: 2, actor: 'chef' }), (e: any) => e.statusCode === 409 && e.value.code === 'RECALL_EXPIRED');
        stub('order', () => ({ id: 2, store_id: 1, order_no: 'ORD-000749', status: 'completed', cleared_at: new Date(), completed_ago: 60 }));
        await assert.rejects(recallOrder({ storeId: 1, orderId: 2, actor: 'chef' }), (e: any) => e.value.code === 'RECALL_EXPIRED');
        stub('order', () => ({ id: 2, store_id: 1, order_no: 'ORD-000749', status: 'preparing', cleared_at: null, completed_ago: null }));
        await assert.rejects(recallOrder({ storeId: 1, orderId: 2, actor: 'chef' }), (e: any) => e.value.code === 'NOT_COMPLETED');
    });

    test('clear served returns how many left the display', async () => {
        stub('clearServed', () => 3);
        assert.deepEqual(await clearServed(1), { cleared: 3 });
    });

    test('board: Preparing and Ready display numbers', async () => {
        stub('boardOrders', () => [
            { order_no: 'ORD-000748', status: 'preparing' },
            { order_no: 'ORD-000749', status: 'completed' },
            { order_no: 'ORD-000750', status: 'preparing' },
        ]);
        const board = await readBoard(1);
        assert.deepEqual(board.preparing, ['000748', '000750']);
        assert.deepEqual(board.ready, ['000749']);
    });

    test('kitchen reads nothing extra for the live event when no screen is connected', async () => {
        let read = false;
        stub('openOrders', () => ((read = true), []));
        const { announceSentToKitchen } = await import('../pipeline/kitchen');
        await announceSentToKitchen(1, 1);
        assert.equal(read, false);
        join({ readyState: 1, send: () => {} }, 1);
        await announceSentToKitchen(1, 1);
        assert.equal(read, true);
    });
});
