import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { connectedCount, join, publish, resetLive } from '../pipeline/live';

// pipeline/live — the live feed hub (design §8.2).

const socket = (readyState = 1) => {
    const sent: any[] = [];
    return { readyState, sent, send: (m: string) => sent.push(JSON.parse(m)) };
};

afterEach(() => resetLive());

describe('pipeline/live', () => {
    test('an event reaches every open screen of the same store only', () => {
        const kiosk = socket();
        const kds = socket();
        const otherStore = socket();
        join(kiosk, 1);
        join(kds, 1);
        join(otherStore, 2);
        publish(1, 'order.completed', { order_id: 7, display_no: '000748' });
        assert.equal(kiosk.sent.length, 1);
        assert.equal(kds.sent.length, 1);
        assert.equal(otherStore.sent.length, 0);
        assert.equal(kiosk.sent[0].event, 'order.completed');
        assert.deepEqual(kiosk.sent[0].data, { order_id: 7, display_no: '000748' });
        assert.ok(!Number.isNaN(Date.parse(kiosk.sent[0].server_time)));
    });

    test('a closed socket is skipped; leaving removes it', () => {
        const closed = socket(3);
        const open = socket();
        join(closed, 1);
        const leave = join(open, 1);
        publish(1, 'order.cleared');
        assert.equal(closed.sent.length, 0);
        assert.equal(open.sent.length, 1);
        assert.equal(connectedCount(1), 2);
        leave();
        assert.equal(connectedCount(1), 1);
    });

    test('a socket that throws on send is dropped, the others still get the event', () => {
        const broken = { readyState: 1, send: () => { throw new Error('gone'); } };
        const ok = socket();
        join(broken, 1);
        join(ok, 1);
        publish(1, 'menu.availability', { kind: 'item', id: 4, available: false });
        assert.equal(ok.sent.length, 1);
        assert.equal(connectedCount(1), 1);
    });
});
