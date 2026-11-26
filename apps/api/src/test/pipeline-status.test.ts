import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canMove, moveStatus } from '../pipeline/status';

// pipeline/status — the order's life (design §4.4).

// A fake executor that records the update and the event insert.
const fakeDb = (updatedRows: number) => {
    const log: any[] = [];
    const chain = (kind: string) => {
        const q: any = { kind, wheres: [] as any[] };
        q.set = (v: any) => ((q.values = v), q);
        q.values = (v: any) => ((q.inserted = v), q);
        q.where = (...w: any[]) => (q.wheres.push(w), q);
        q.executeTakeFirst = async () => (log.push(q), { numUpdatedRows: BigInt(updatedRows) });
        q.execute = async () => (log.push(q), []);
        return q;
    };
    return { db: { updateTable: () => chain('update'), insertInto: () => chain('insert') } as any, log };
};

describe('pipeline/status', () => {
    test('allowed moves (design §4.4)', () => {
        assert.equal(canMove('awaiting_payment', 'preparing'), true);
        assert.equal(canMove('awaiting_payment', 'cancelled'), true);
        assert.equal(canMove('preparing', 'completed'), true);
        assert.equal(canMove('completed', 'preparing'), true); // recall
        assert.equal(canMove('completed', 'voided'), true);
        assert.equal(canMove('awaiting_payment', 'completed'), false);
        assert.equal(canMove('cancelled', 'preparing'), false);
        assert.equal(canMove('voided', 'preparing'), false);
    });

    test('moveStatus updates only while still `from`, clears the lock, stamps and logs', async () => {
        const { db, log } = fakeDb(1);
        await moveStatus(db, { order_id: 7, from_status: 'awaiting_payment', to_status: 'cancelled', actor_type: 'system' });
        const [update, insert] = log;
        assert.equal(update.values.status, 'cancelled');
        assert.equal(update.values.locked_by_terminal_id, null);
        assert.ok('cancelled_at' in update.values);
        assert.deepEqual(update.wheres, [
            ['id', '=', 7],
            ['status', '=', 'awaiting_payment'],
        ]);
        assert.equal(insert.inserted.to_status, 'cancelled');
    });

    test('a move that is not allowed, or an order changed by another screen, is 409', async () => {
        await assert.rejects(moveStatus(fakeDb(1).db, { order_id: 7, from_status: 'cancelled', to_status: 'preparing', actor_type: 'cashier' }), (e: any) => e.statusCode === 409);
        await assert.rejects(moveStatus(fakeDb(0).db, { order_id: 7, from_status: 'awaiting_payment', to_status: 'preparing', actor_type: 'cashier' }), (e: any) => e.statusCode === 409);
    });
});
