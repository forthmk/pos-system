import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { mockModule } from './test-utils';
import { join, resetLive } from '../pipeline/live';

// modules/admin — setup rules (design §8.1): store ownership, duplicates,
// fixed Senior / PWD rate, the last admin, unpairing, settings.

const dup = () => Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
const repo = mockModule(__dirname, '../modules/admin/admin.repository', {
    transaction: async (fn: any) => fn('trx'),
    categoryById: async (id: number) => ({ id, store_id: 1 }),
    itemById: async (id: number) => ({ id, store_id: 1 }),
    addonById: async (id: number) => ({ id, store_id: 1 }),
    addonsOfStore: async (_s: number, ids: number[]) => ids.map((id) => ({ id })),
    insertCategory: async () => 10,
    updateCategory: async () => undefined,
    insertItem: async () => 20,
    updateItem: async () => undefined,
    replaceItemAddons: async () => undefined,
    setTranslation: async () => undefined,
    stationById: async (id: number) => ({ id, store_id: 1 }),
    terminalById: async (id: number) => ({ id, store_id: 1, type: 'kiosk', code: 'KIOSK-01' }),
    insertTerminal: async () => 5,
    unpairTerminal: async () => undefined,
    discountTypeById: async (id: number) => ({ id, store_id: 1, kind: 'percent', code: 'STUDENT' }),
    updateDiscountType: async () => undefined,
    voucherById: async (id: number) => ({ id, store_id: 1 }),
    insertVoucher: async () => 7,
    updateVoucher: async () => undefined,
    userById: async (id: number) => ({ id, store_id: 1, role: 'admin', is_active: 1 }),
    activeAdmins: async () => 1,
    insertUser: async () => 9,
    updateUser: async () => 1,
    store: async () => ({ code: '01', name: 'QuickBite #01' }),
    settings: async () => [{ key: 'kds_delay_minutes', value: '5' }],
    saveSettings: async () => undefined,
});
const service: Record<string, any> = require('../modules/admin/admin.service');

const ITEM = { category_id: 1, sku: 'b9', name: ' Test Burger ', price: 99, addons: [{ addon_id: 1 }, { addon_id: 2, price_override: 20 }] };
const err = (status: number, code?: string) => (e: any) => e.statusCode === status && (code === undefined || e.value?.code === code);
const admin = { kind: 'staff', id: 1, store_id: 1, role: 'admin', terminal: null };

beforeEach(() => {
    repo.reset();
    resetLive();
});

describe('admin · menu', () => {
    test('a new item: SKU upper-cased, price as text, extras in order, live menu.changed', async () => {
        const sent: any[] = [];
        join({ readyState: 1, send: (m: string) => sent.push(JSON.parse(m)) }, 1);
        assert.deepEqual(await service.saveItem(1, null, ITEM), { id: 20 });
        const values = repo.calls.insertItem[0][1];
        assert.equal(values.sku, 'B9');
        assert.equal(values.name, 'Test Burger');
        assert.equal(values.price, '99.00');
        assert.deepEqual(repo.calls.replaceItemAddons[0][2], [
            { addon_id: 1, price_override: null },
            { addon_id: 2, price_override: 20 },
        ]);
        assert.equal(sent[0].event, 'menu.changed');
    });

    test('duplicate SKU → 409; another store’s category / extra → 404; an extra twice → 400', async () => {
        repo.repository._insertItem = async () => {
            throw dup();
        };
        await assert.rejects(service.saveItem(1, null, ITEM), err(409, 'DUPLICATE'));
        repo.reset();
        repo.repository._categoryById = async (id: number) => ({ id, store_id: 2 });
        await assert.rejects(service.saveItem(1, null, ITEM), err(404));
        repo.reset();
        repo.repository._addonsOfStore = async () => [{ id: 1 }];
        await assert.rejects(service.saveItem(1, null, ITEM), err(404));
        await assert.rejects(service.saveItem(1, null, { ...ITEM, addons: [{ addon_id: 1 }, { addon_id: 1 }] }), err(400));
    });

    test('translations: Chinese / Korean saved per language', async () => {
        await service.saveCategory(1, 3, { code: 'b', name: 'Burgers', translations: { zh: { name: '汉堡' }, ko: { name: '' } } });
        assert.deepEqual(
            repo.calls.setTranslation.map((c: any[]) => [c[1], c[3], c[4], c[5]]),
            [
                ['category_translations', 3, 'zh', '汉堡'],
                ['category_translations', 3, 'ko', ''],
            ],
        );
        assert.equal(repo.calls.updateCategory[0][2].code, 'B');
    });
});

describe('admin · discounts, vouchers', () => {
    test('Student % can change; the Senior / PWD 20% can’t', async () => {
        await service.updateDiscountType(1, 2, { rate: 0.15 });
        assert.equal(repo.calls.updateDiscountType[0][1].rate, '0.1500');
        repo.repository._discountTypeById = async (id: number) => ({ id, store_id: 1, kind: 'senior_pwd', code: 'SENIOR' });
        await assert.rejects(service.updateDiscountType(1, 3, { rate: 0.1 }), err(400));
        await service.updateDiscountType(1, 3, { name: 'Senior Citizen', is_active: true });
    });

    test('voucher: code upper-cased; > 100% or ending before it starts → 400; duplicate → 409', async () => {
        await service.saveVoucher(1, null, { code: 'save50', kind: 'fixed', value: 50 });
        assert.equal(repo.calls.insertVoucher[0].code, 'SAVE50');
        await assert.rejects(service.saveVoucher(1, null, { code: 'X10', kind: 'percent', value: 120 }), err(400));
        await assert.rejects(
            service.saveVoucher(1, null, { code: 'X10', kind: 'percent', value: 10, valid_from: '2026-12-02T00:00:00Z', valid_to: '2026-12-01T00:00:00Z' }),
            err(400),
        );
        repo.repository._insertVoucher = async () => {
            throw dup();
        };
        await assert.rejects(service.saveVoucher(1, null, { code: 'save50', kind: 'fixed', value: 50 }), err(409, 'DUPLICATE'));
    });
});

describe('admin · staff', () => {
    test('a new user gets a hashed PIN, lower-case username', async () => {
        await service.createUser(1, { username: 'Ana.C', name: 'Ana', role: 'cashier', pin: '4321' });
        const row = repo.calls.insertUser[0];
        assert.equal(row.username, 'ana.c');
        assert.ok(await bcrypt.compare('4321', row.pin_hash));
        assert.ok(!('pin' in row));
    });

    test('the last active admin can’t be demoted or switched off; nobody switches themselves off', async () => {
        await assert.rejects(service.updateUser(admin, 2, { role: 'manager' }), err(409, 'LAST_ADMIN'));
        await assert.rejects(service.updateUser(admin, 2, { is_active: false }), err(409, 'LAST_ADMIN'));
        await assert.rejects(service.updateUser(admin, 1, { is_active: false }), err(409, 'SELF'));
        repo.repository._activeAdmins = async () => 2;
        await service.updateUser(admin, 2, { role: 'manager' });
        assert.equal(repo.calls.updateUser[0][1].role, 'manager');
    });

    test('a PIN reset stores a new hash; another store’s user → 404', async () => {
        await service.updateUser(admin, 2, { pin: '9876' });
        assert.ok(await bcrypt.compare('9876', repo.calls.updateUser[0][1].pin_hash));
        repo.repository._userById = async (id: number) => ({ id, store_id: 2, role: 'cashier', is_active: 1 });
        await assert.rejects(service.updateUser(admin, 2, { name: 'X' }), err(404));
    });
});

describe('admin · screens, settings', () => {
    test('only a kitchen screen has a station; a register can’t be unpaired', async () => {
        await assert.rejects(service.createTerminal(1, { code: 'kiosk-02', type: 'kiosk', name: 'Kiosk 2', kds_station_id: 1 }), err(400));
        assert.deepEqual(await service.createTerminal(1, { code: 'kiosk-02', type: 'kiosk', name: 'Kiosk 2' }), { id: 5 });
        assert.equal(repo.calls.insertTerminal[0].code, 'KIOSK-02');
        assert.deepEqual(await service.unpairTerminal(1, 1), { id: 1, paired: false });
        repo.repository._terminalById = async (id: number) => ({ id, store_id: 1, type: 'pos', code: 'POS-01' });
        await assert.rejects(service.unpairTerminal(1, 2), err(400));
    });

    test('settings: saved as text, live settings.changed, fixed VAT / Senior rates shown', async () => {
        const sent: any[] = [];
        join({ readyState: 1, send: (m: string) => sent.push(JSON.parse(m)) }, 1);
        const result = await service.saveSettings(1, { kds_delay_minutes: 7 });
        assert.deepEqual(repo.calls.saveSettings[0], [1, { kds_delay_minutes: '7' }]);
        assert.equal(sent[0].event, 'settings.changed');
        assert.equal(result.values.kds_delay_minutes, 5); // from the stubbed read
        assert.deepEqual(result.fixed, { vat_rate: 0.12, senior_pwd_rate: 0.2, kiosk_online_payment: 'off' });
    });
});
