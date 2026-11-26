import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { mockModule } from './test-utils';

// Staff PIN sign-in, kiosk / KDS device sign-in, and the "re-read on every
// request" check behind fastify.authenticate (design §2.2).

const PIN_HASH = bcrypt.hashSync('2222', 4);
const cashier = {
    id: 3,
    store_id: 1,
    username: 'cashier',
    name: 'Cashier One',
    role: 'cashier',
    pin_hash: PIN_HASH,
    is_active: 1,
};
const pos = { id: 2, store_id: 1, code: 'POS-01', type: 'pos', name: 'Cashier Register 01', is_active: 1, kds_station_id: null, device_token_hash: null };
const kiosk = { id: 1, store_id: 1, code: 'KIOSK-01', type: 'kiosk', name: 'Self-service Kiosk 01', is_active: 1, kds_station_id: null, device_token_hash: null };

const { repository: users, calls: userCalls, reset: resetUsers } = mockModule(__dirname, '../modules/users/users.repository', {
    getById: async () => cashier,
    getByUsername: async () => cashier,
    touchLogin: async () => undefined,
});
const { repository: terminals, reset: resetTerminals } = mockModule(__dirname, '../modules/terminals/terminals.repository', {
    getById: async () => pos,
    getByCode: async () => pos,
    getByTokenHash: async () => undefined,
    setTokenHash: async () => undefined,
    touchSeen: async () => undefined,
    list: async () => [],
});

const service: Record<string, any> = require('../modules/auth/auth.service');
const terminalsService: Record<string, any> = require('../modules/terminals/terminals.service');
const { clearThrottle, MAX_FAILURES } = require('../utils/loginThrottle');

const status = (code: number) => (err: any) => err.statusCode === code;

describe('auth.login (PIN sign-in)', () => {
    beforeEach(() => {
        resetUsers();
        resetTerminals();
        clearThrottle();
    });

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
        assert.equal(userCalls.touchLogin[0], 3);
    });

    test('wrong PIN and unknown user both get the same 401', async () => {
        await assert.rejects(service.login({ username: 'cashier', pin: '9999' }), (e: any) => e.statusCode === 401 && e.message === 'Wrong username or PIN.');
        users._getByUsername = async () => undefined;
        await assert.rejects(service.login({ username: 'nobody', pin: '2222' }), (e: any) => e.statusCode === 401 && e.message === 'Wrong username or PIN.');
    });

    test('a switched-off account is refused (403)', async () => {
        users._getByUsername = async () => ({ ...cashier, is_active: 0 });
        await assert.rejects(service.login({ username: 'cashier', pin: '2222' }), status(403));
    });

    test(`${MAX_FAILURES} wrong PINs lock the username — even the right PIN gets 429`, async () => {
        for (let i = 0; i < MAX_FAILURES; i++) {
            await assert.rejects(service.login({ username: 'cashier', pin: '0000' }), status(401));
        }
        await assert.rejects(service.login({ username: 'Cashier', pin: '2222' }), status(429));
    });

    test('staff cannot sign in on the kiosk (403); an unknown terminal is 404', async () => {
        terminals._getByCode = async () => kiosk;
        await assert.rejects(service.login({ username: 'cashier', pin: '2222', terminal_code: 'KIOSK-01' }), status(403));
        terminals._getByCode = async () => undefined;
        await assert.rejects(service.login({ username: 'cashier', pin: '2222', terminal_code: 'POS-99' }), status(404));
    });
});

describe('auth.deviceLogin (kiosk / KDS)', () => {
    beforeEach(() => {
        resetUsers();
        resetTerminals();
    });

    test('a paired kiosk gets a device token tagged with its current pairing', async () => {
        const hash = terminalsService.hashToken('qbd_secret-token-for-tests-123');
        terminals._getByTokenHash = async (h: string) => (h === hash ? { ...kiosk, device_token_hash: hash } : undefined);
        const { principal, token } = await service.deviceLogin('qbd_secret-token-for-tests-123');
        assert.equal(principal.kind, 'device');
        assert.equal(principal.type, 'kiosk');
        assert.deepEqual(token, { kind: 'device', sub: 1, store_id: 1, type: 'kiosk', pair: hash.slice(0, 12) });
    });

    test('an unknown device token is refused (401)', async () => {
        await assert.rejects(service.deviceLogin('qbd_not-a-real-token-000000'), status(401));
    });
});

describe('auth.resolvePrincipal (every request)', () => {
    beforeEach(() => {
        resetUsers();
        resetTerminals();
    });

    test('an active staff token resolves to the user as they are now', async () => {
        users._getById = async () => ({ ...cashier, role: 'manager' });
        const p = await service.resolvePrincipal({ kind: 'staff', sub: 3, store_id: 1, role: 'cashier', terminal_id: 2 });
        assert.equal(p.role, 'manager');
        assert.equal(p.terminal.code, 'POS-01');
    });

    test('a user switched off since signing in must sign in again (401)', async () => {
        users._getById = async () => ({ ...cashier, is_active: 0 });
        await assert.rejects(service.resolvePrincipal({ kind: 'staff', sub: 3, store_id: 1, role: 'cashier', terminal_id: null }), status(401));
    });

    test('a screen paired again (new hash) can no longer use its old token (401)', async () => {
        terminals._getById = async () => ({ ...kiosk, device_token_hash: 'ffffffffffffnewhash' });
        await assert.rejects(service.resolvePrincipal({ kind: 'device', sub: 1, store_id: 1, type: 'kiosk', pair: 'aaaaaaaaaaaa' }), status(401));
    });

    test('a screen still paired resolves to its terminal', async () => {
        terminals._getById = async () => ({ ...kiosk, device_token_hash: 'aaaaaaaaaaaarest' });
        const p = await service.resolvePrincipal({ kind: 'device', sub: 1, store_id: 1, type: 'kiosk', pair: 'aaaaaaaaaaaa' });
        assert.equal(p.code, 'KIOSK-01');
    });

    test('anything else is refused (401)', async () => {
        await assert.rejects(service.resolvePrincipal({ user_id: 1 }), status(401));
    });
});
