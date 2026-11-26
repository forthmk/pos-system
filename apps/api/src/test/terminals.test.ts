import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mockModule } from './test-utils';

// Pairing kiosk / KDS screens (design §8.1 POST /api/terminals/:id/pair).

const kds = { id: 3, store_id: 1, code: 'EXPO-01', type: 'kds', name: 'Kitchen Display 01', is_active: 1, device_token_hash: null };
const pos = { id: 2, store_id: 1, code: 'POS-01', type: 'pos', name: 'Cashier Register 01', is_active: 1, device_token_hash: null };

const { repository: terminals, calls, reset } = mockModule(__dirname, '../modules/terminals/terminals.repository', {
    getById: async () => kds,
    getByCode: async () => kds,
    getByTokenHash: async () => undefined,
    setTokenHash: async () => undefined,
    touchSeen: async () => undefined,
    list: async () => [],
});

const service: Record<string, any> = require('../modules/terminals/terminals.service');
const status = (code: number) => (err: any) => err.statusCode === code;

describe('terminals.pair', () => {
    beforeEach(() => reset());

    test('returns a new device token once and stores only its SHA-256 hash', async () => {
        const res = await service.pair(3, 1);
        assert.match(res.device_token, /^qbd_[A-Za-z0-9_-]{43}$/);
        assert.deepEqual(res.terminal, { id: 3, code: 'EXPO-01', type: 'kds', name: 'Kitchen Display 01' });
        const [id, storedHash] = calls.setTokenHash[0];
        assert.equal(id, 3);
        assert.equal(storedHash, createHash('sha256').update(res.device_token).digest('hex'));
        assert.notEqual(storedHash, res.device_token);
    });

    test('each pairing makes a different token', async () => {
        const a = await service.pair(3, 1);
        const b = await service.pair(3, 1);
        assert.notEqual(a.device_token, b.device_token);
    });

    test('a cashier register is not paired (400)', async () => {
        terminals._getById = async () => pos;
        await assert.rejects(service.pair(2, 1), status(400));
    });

    test('an unknown terminal, or another store’s, is 404', async () => {
        terminals._getById = async () => undefined;
        await assert.rejects(service.pair(99, 1), status(404));
        terminals._getById = async () => ({ ...kds, store_id: 2 });
        await assert.rejects(service.pair(3, 1), status(404));
    });

    test('a switched-off terminal is not paired (400)', async () => {
        terminals._getById = async () => ({ ...kds, is_active: 0 });
        await assert.rejects(service.pair(3, 1), status(400));
    });
});

describe('terminals.renew', () => {
    beforeEach(() => reset());

    test('a known, active screen is renewed and marked as seen', async () => {
        terminals._getByTokenHash = async () => ({ ...kds, device_token_hash: 'h' });
        const t = await service.renew('qbd_any');
        assert.equal(t.code, 'EXPO-01');
        assert.equal(calls.touchSeen[0], 3);
    });

    test('unknown token, switched-off screen, or a register token are all 401', async () => {
        await assert.rejects(service.renew('qbd_unknown'), status(401));
        terminals._getByTokenHash = async () => ({ ...kds, is_active: 0 });
        await assert.rejects(service.renew('qbd_any'), status(401));
        terminals._getByTokenHash = async () => pos;
        await assert.rejects(service.renew('qbd_any'), status(401));
    });
});
