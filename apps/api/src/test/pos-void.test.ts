import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mockModule } from './test-utils';

// Void + refund at the register (design decision 16): manager username + PIN,
// only paid orders, only while their shift is still open.

require.cache[require.resolve(path.resolve(__dirname, '../services/database.service'))] = {
    exports: { db: { transaction: () => ({ execute: (fn: any) => fn('trx') }) } },
    loaded: true,
} as NodeModule;

const paid = { id: 12, store_id: 1, order_no: 'ORD-000012', status: 'completed', shift_id: 1, shift_status: 'open' };
const repo = mockModule(__dirname, '../modules/pos/pos.repository', {
    orderForVoid: async () => paid,
    markVoided: async () => undefined,
    refundPayments: async () => undefined,
});
const auth = mockModule(__dirname, '../modules/auth/auth.service', {
    verifyApprover: async () => ({ id: 2, name: 'Manager One', role: 'manager' }),
});
const pipelineStatus = mockModule(__dirname, '../pipeline/status', { moveStatus: async () => undefined, logEvent: async () => undefined });
mockModule(__dirname, '../pipeline/orders', { getOrder: async (id: number) => ({ id, status: 'voided' }) });

const service: Record<string, any> = require('../modules/pos/pos.service');
const cashier = { kind: 'staff', id: 3, store_id: 1, role: 'cashier', terminal: { id: 2, code: 'POS-01', type: 'pos' } };
const body = { manager_username: 'manager', manager_pin: '1111', reason: 'Wrong order' };
const code = (c: string) => (e: any) => e.statusCode === 409 && e.value?.code === c;

beforeEach(() => {
    repo.reset();
    auth.reset();
    pipelineStatus.reset();
});

describe('pos.voidOrder', () => {
    test('a paid order in an open shift → voided by the manager, payment refunded', async () => {
        const result = await service.voidOrder(cashier, 12, body);
        assert.equal(result.status, 'voided');
        assert.deepEqual(auth.calls.verifyApprover[0], ['manager', '1111', 'orders.void', 1]);
        const move = pipelineStatus.calls.moveStatus[0][1];
        assert.equal(move.from_status, 'completed');
        assert.equal(move.to_status, 'voided');
        assert.equal(move.actor_type, 'manager');
        assert.equal(move.user_id, 2);
        assert.equal(move.terminal_id, 2);
        assert.deepEqual(repo.calls.markVoided[0], ['trx', 12, 2, 'Wrong order']);
        assert.deepEqual(repo.calls.refundPayments[0], ['trx', 12]);
    });

    test('wrong manager PIN stops it before anything changes', async () => {
        auth.repository._verifyApprover = async () => {
            throw Object.assign(new Error('Wrong manager username or PIN.'), { statusCode: 401 });
        };
        await assert.rejects(service.voidOrder(cashier, 12, body), (e: any) => e.statusCode === 401);
        assert.equal(pipelineStatus.calls.moveStatus.length, 0);
    });

    test('already voided, never paid, or in a closed Z-reading → 409', async () => {
        repo.repository._orderForVoid = async () => ({ ...paid, status: 'voided' });
        await assert.rejects(service.voidOrder(cashier, 12, body), code('ALREADY_VOIDED'));
        repo.repository._orderForVoid = async () => ({ ...paid, status: 'awaiting_payment' });
        await assert.rejects(service.voidOrder(cashier, 12, body), code('NOT_PAID'));
        repo.repository._orderForVoid = async () => ({ ...paid, shift_status: 'closed' });
        await assert.rejects(service.voidOrder(cashier, 12, body), code('SHIFT_CLOSED'));
        repo.repository._orderForVoid = async () => ({ ...paid, store_id: 2 });
        await assert.rejects(service.voidOrder(cashier, 12, body), (e: any) => e.statusCode === 404);
        assert.equal(pipelineStatus.calls.moveStatus.length, 0);
    });
});
