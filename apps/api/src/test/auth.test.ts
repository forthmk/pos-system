import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { mockModule } from './test-utils';

// modules/auth (design §2.2): staff PIN sign-in, pairing kiosk / KDS screens,
// device sign-in, and the "re-read on every request" check.

const PIN_HASH = bcrypt.hashSync('2222', 4);
const cashier = { id: 3, store_id: 1, username: 'cashier', name: 'Cashier One', role: 'cashier', pin_hash: PIN_HASH, is_active: 1 };
const pos = { id: 2, store_id: 1, code: 'POS-01', type: 'pos', name: 'Cashier Register 01', is_active: 1, kds_station_id: null, device_token_hash: null };
const kiosk = { id: 1, store_id: 1, code: 'KIOSK-01', type: 'kiosk', name: 'Self-service Kiosk 01', is_active: 1, kds_station_id: null, device_token_hash: null };
const kds = { id: 3, store_id: 1, code: 'EXPO-01', type: 'kds', name: 'Kitchen Display 01', is_active: 1, kds_station_id: 1, device_token_hash: null };

const { repository: repo, calls, reset } = mockModule(__dirname, '../modules/auth/auth.repository', {
    getUserById: async () => cashier,
    getUserByUsername: async () => cashier,
    touchLogin: async () => undefined,
    getTerminalById: async () => pos,
    getTerminalByCode: async () => pos,
    getTerminalByTokenHash: async () => undefined,
    setTerminalTokenHash: async () => undefined,
    touchTerminalSeen: async () => undefined,
    listTerminals: async () => [],
});

const service: Record<string, any> = require('../modules/auth/auth.service');
const { clearThrottle, MAX_FAILURES } = require('../utils/loginThrottle');
const status = (code: number) => (err: any) => err.statusCode === code;

beforeEach(() => {
    reset();
    clearThrottle();
});

describe('auth.login (PIN sign-in)', () => {
    test('right PIN at POS-01: the staff principal and a staff token bound to that register', async () => {
        const { principal, token } = await service.login({ username: 'cashier', pin: '2222', terminal_code: 'POS-01' });
        assert.deepEqual(principal, {
            kind: 'staff',
            id: 3,
            store_id: 1,
            username: 'cashier',
            name: 'Cashier One',
            role: 'cashier',
            terminal: { id: 2, code: 'POS-01', type: 'pos' },
        });
        assert.deepEqual(token, { kind: 'staff', sub: 3, store_id: 1, role: 'cashier', terminal_id: 2 });
        assert.equal('pin_hash' in principal, false);
        assert.equal(calls.touchLogin[0], 3);
    });

    test('wrong PIN and unknown user both get the same 401', async () => {
        await assert.rejects(service.login({ username: 'cashier', pin: '9999' }), (e: any) => e.statusCode === 401 && e.message === 'Wrong username or PIN.');
        repo._getUserByUsername = async () => undefined;
        await assert.rejects(service.login({ username: 'nobody', pin: '2222' }), (e: any) => e.statusCode === 401 && e.message === 'Wrong username or PIN.');
    });

    test('a switched-off account is refused (403)', async () => {
        repo._getUserByUsername = async () => ({ ...cashier, is_active: 0 });
        await assert.rejects(service.login({ username: 'cashier', pin: '2222' }), status(403));
    });

    test(`${MAX_FAILURES} wrong PINs lock the username — even the right PIN gets 429`, async () => {
        for (let i = 0; i < MAX_FAILURES; i++) await assert.rejects(service.login({ username: 'cashier', pin: '0000' }), status(401));
        await assert.rejects(service.login({ username: 'Cashier', pin: '2222' }), status(429));
    });

    test('staff cannot sign in on the kiosk (403); an unknown terminal is 404', async () => {
        repo._getTerminalByCode = async () => kiosk;
        await assert.rejects(service.login({ username: 'cashier', pin: '2222', terminal_code: 'KIOSK-01' }), status(403));
        repo._getTerminalByCode = async () => undefined;
        await assert.rejects(service.login({ username: 'cashier', pin: '2222', terminal_code: 'POS-99' }), status(404));
    });
});

describe('auth.pair (kiosk / KDS screens)', () => {
    test('returns a new device token once and stores only its SHA-256 hash', async () => {
        repo._getTerminalById = async () => kds;
        const res = await service.pair(3, 1);
        assert.match(res.device_token, /^qbd_[A-Za-z0-9_-]{43}$/);
        assert.deepEqual(res.terminal, { id: 3, code: 'EXPO-01', type: 'kds', name: 'Kitchen Display 01' });
        const [id, storedHash] = calls.setTerminalTokenHash[0];
        assert.equal(id, 3);
        assert.equal(storedHash, createHash('sha256').update(res.device_token).digest('hex'));
    });

    test('each pairing makes a different token', async () => {
        repo._getTerminalById = async () => kds;
        assert.notEqual((await service.pair(3, 1)).device_token, (await service.pair(3, 1)).device_token);
    });

    test('a cashier register or a switched-off screen is not paired (400); unknown / other store 404', async () => {
        await assert.rejects(service.pair(2, 1), status(400));
        repo._getTerminalById = async () => ({ ...kds, is_active: 0 });
        await assert.rejects(service.pair(3, 1), status(400));
        repo._getTerminalById = async () => undefined;
        await assert.rejects(service.pair(99, 1), status(404));
        repo._getTerminalById = async () => ({ ...kds, store_id: 2 });
        await assert.rejects(service.pair(3, 1), status(404));
    });
});

describe('auth.deviceLogin (kiosk / KDS)', () => {
    test('a paired kiosk gets a device token tagged with its current pairing, and is marked seen', async () => {
        const hash = service.hashToken('qbd_secret-token-for-tests-123');
        repo._getTerminalByTokenHash = async (h: string) => (h === hash ? { ...kiosk, device_token_hash: hash } : undefined);
        const { principal, token } = await service.deviceLogin('qbd_secret-token-for-tests-123');
        assert.equal(principal.type, 'kiosk');
        assert.deepEqual(token, { kind: 'device', sub: 1, store_id: 1, type: 'kiosk', pair: hash.slice(0, 12) });
        assert.equal(calls.touchTerminalSeen[0], 1);
    });

    test('unknown token, switched-off screen, or a register are all 401', async () => {
        await assert.rejects(service.deviceLogin('qbd_unknown'), status(401));
        repo._getTerminalByTokenHash = async () => ({ ...kiosk, is_active: 0, device_token_hash: 'h' });
        await assert.rejects(service.deviceLogin('qbd_any'), status(401));
        repo._getTerminalByTokenHash = async () => ({ ...pos, device_token_hash: 'h' });
        await assert.rejects(service.deviceLogin('qbd_any'), status(401));
    });
});

describe('auth.resolvePrincipal (every request)', () => {
    test('an active staff token resolves to the user as they are now', async () => {
        repo._getUserById = async () => ({ ...cashier, role: 'manager' });
        const p = await service.resolvePrincipal({ kind: 'staff', sub: 3, store_id: 1, role: 'cashier', terminal_id: 2 });
        assert.equal(p.role, 'manager');
        assert.equal(p.terminal.code, 'POS-01');
    });

    test('a user switched off since signing in must sign in again (401)', async () => {
        repo._getUserById = async () => ({ ...cashier, is_active: 0 });
        await assert.rejects(service.resolvePrincipal({ kind: 'staff', sub: 3, store_id: 1, role: 'cashier', terminal_id: null }), status(401));
    });

    test('a screen paired again (new hash) can no longer use its old token (401); still paired resolves', async () => {
        repo._getTerminalById = async () => ({ ...kiosk, device_token_hash: 'ffffffffffffnewhash' });
        await assert.rejects(service.resolvePrincipal({ kind: 'device', sub: 1, store_id: 1, type: 'kiosk', pair: 'aaaaaaaaaaaa' }), status(401));
        repo._getTerminalById = async () => ({ ...kiosk, device_token_hash: 'aaaaaaaaaaaarest' });
        assert.equal((await service.resolvePrincipal({ kind: 'device', sub: 1, store_id: 1, type: 'kiosk', pair: 'aaaaaaaaaaaa' })).code, 'KIOSK-01');
    });

    test('anything else is refused (401)', async () => {
        await assert.rejects(service.resolvePrincipal({ user_id: 1 }), status(401));
    });
});
