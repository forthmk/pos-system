import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { formatSlipCode, parseSlipCode, slipCode } from '@pos-system/shared';
import { mockModule } from './test-utils';

// The kiosk slip barcode (design §7.11) and scanning it at the register (§5.10).

// db.transaction().execute(fn) → fn('trx'): the expiry cancel runs "in a transaction".
require.cache[require.resolve(path.resolve(__dirname, '../services/database.service'))] = {
    exports: { db: { transaction: () => ({ execute: (fn: any) => fn('trx') }) } },
    loaded: true,
} as NodeModule;

const awaiting = {
    id: 748,
    order_no: 'ORD-000748',
    status: 'awaiting_payment',
    slip_token: '527',
    placed_at: new Date(Date.now() - 5 * 60_000),
    locked_by_terminal_id: null,
    locked_at: null,
    store_code: '01',
    locked_by_code: null,
};
const repo = mockModule(__dirname, '../modules/pos/pos.repository', {
    findForScan: async () => awaiting,
    lock: async () => undefined,
    release: async () => true,
    settings: async () => [
        { key: 'awaiting_payment_expiry_minutes', value: '30' },
        { key: 'order_lock_minutes', value: '5' },
    ],
});
const pipelineOrders = mockModule(__dirname, '../pipeline/orders', {
    getOrder: async (id: number) => ({ id, order_no: 'ORD-000748', status: 'awaiting_payment' }),
});
const pipelineStatus = mockModule(__dirname, '../pipeline/status', {
    moveStatus: async () => undefined,
    logEvent: async () => undefined,
});

const service: Record<string, any> = require('../modules/pos/pos.service');

const cashier = { kind: 'staff', id: 3, store_id: 1, role: 'cashier', terminal: { id: 2, code: 'POS-01', type: 'pos' } };
const CODE = '010007485278';
const status = (code: number) => (err: any) => err.statusCode === code;

beforeEach(() => {
    repo.reset();
    pipelineOrders.reset();
    pipelineStatus.reset();
});

describe('slip code (design §7.11)', () => {
    test('store 01 + order 748 + slip 527 → 010007485278 / 01-000748-527-8', () => {
        assert.equal(slipCode('01', 748, '527'), CODE);
        assert.equal(formatSlipCode(CODE), '01-000748-527-8');
    });

    test('reads a scan or a typed code with dashes; a wrong check digit or length is null', () => {
        assert.deepEqual(parseSlipCode('01-000748-527-8'), { code: CODE, store: '01', orderNumber: 748, slipToken: '527' });
        assert.equal(parseSlipCode('010007485279'), null);
        assert.equal(parseSlipCode('01000748527'), null);
        assert.equal(parseSlipCode('abc'), null);
    });
});

describe('pos.scan', () => {
    test('awaiting payment → locked to this register, scanned event, the order back', async () => {
        const r = await service.scan(cashier, '01-000748-527-8');
        assert.equal(r.result, 'ready');
        assert.equal(r.order.id, 748);
        assert.deepEqual(repo.calls.findForScan[0], [1, 748]);
        assert.deepEqual(repo.calls.lock[0], [748, 2]);
        assert.equal(pipelineStatus.calls.logEvent[0][1].event_type, 'scanned');
        assert.ok(new Date(r.locked_until).getTime() > Date.now() + 4 * 60_000);
    });

    test('a bad read (check digit) is 400 without asking the database', async () => {
        await assert.rejects(service.scan(cashier, '010007485279'), (e: any) => e.statusCode === 400 && e.value.code === 'BAD_CODE');
        assert.equal(repo.calls.findForScan.length, 0);
    });

    test('a guessed number with the wrong slip code, or another store, is 404', async () => {
        await assert.rejects(service.scan(cashier, slipCode('01', 748, '111')), (e: any) => e.statusCode === 404 && e.value.code === 'SLIP_NOT_FOUND');
        await assert.rejects(service.scan(cashier, slipCode('02', 748, '527')), status(404));
        repo.repository._findForScan = async () => undefined;
        await assert.rejects(service.scan(cashier, CODE), status(404));
    });

    test('already paid → no second charge', async () => {
        repo.repository._findForScan = async () => ({ ...awaiting, status: 'preparing' });
        assert.deepEqual(await service.scan(cashier, CODE), { result: 'already_paid', order_no: 'ORD-000748', status: 'preparing' });
        assert.equal(repo.calls.lock.length, 0);
    });

    test('not paid within 30 minutes → cancelled by the system, "expired" with its lines', async () => {
        repo.repository._findForScan = async () => ({ ...awaiting, placed_at: new Date(Date.now() - 31 * 60_000) });
        const r = await service.scan(cashier, CODE);
        assert.equal(r.result, 'expired');
        const [, move] = pipelineStatus.calls.moveStatus[0];
        assert.deepEqual([move.from_status, move.to_status, move.actor_type], ['awaiting_payment', 'cancelled', 'system']);
    });

    test('open on another register within 5 minutes → in_use; an older lock is taken over', async () => {
        repo.repository._findForScan = async () => ({ ...awaiting, locked_by_terminal_id: 9, locked_at: new Date(Date.now() - 60_000), locked_by_code: 'POS-02' });
        assert.deepEqual(await service.scan(cashier, CODE), { result: 'in_use', order_no: 'ORD-000748', terminal: 'POS-02' });
        repo.repository._findForScan = async () => ({ ...awaiting, locked_by_terminal_id: 9, locked_at: new Date(Date.now() - 6 * 60_000), locked_by_code: 'POS-02' });
        assert.equal((await service.scan(cashier, CODE)).result, 'ready');
    });

    test('only a cashier signed in at a register can scan (400)', async () => {
        await assert.rejects(service.scan({ ...cashier, terminal: null }, CODE), status(400));
        await assert.rejects(service.scan({ kind: 'device', id: 1, store_id: 1, type: 'kiosk' }, CODE), status(400));
    });

    test('release unlocks only this register’s lock', async () => {
        assert.deepEqual(await service.release(cashier, 748), { released: true });
        assert.deepEqual(repo.calls.release[0], [748, 2]);
    });
});
