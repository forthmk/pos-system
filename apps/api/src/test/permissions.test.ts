import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { can, PERMISSIONS } from '@pos-system/shared';

// The roles table (design §2.2) — what each role / screen may do.

describe('permissions (design §2.2)', () => {
    test('cashier: ring up, settle, cancel, sold out, own shift, live report — but not void, export or setup', () => {
        for (const p of ['orders.create', 'orders.settle', 'orders.cancel', 'menu.availability', 'shifts.use', 'reports.view'] as const) {
            assert.equal(can('cashier', p), true, p);
        }
        for (const p of ['orders.void', 'reports.export', 'vouchers.manage', 'menu.edit', 'users.manage', 'terminals.manage'] as const) {
            assert.equal(can('cashier', p), false, p);
        }
    });

    test('manager: everything a cashier does plus void, export and vouchers', () => {
        for (const p of ['orders.settle', 'orders.void', 'reports.export', 'vouchers.manage', 'kds.use'] as const) {
            assert.equal(can('manager', p), true, p);
        }
        assert.equal(can('manager', 'users.manage'), false);
    });

    test('chef: the kitchen display only', () => {
        assert.equal(can('chef', 'kds.use'), true);
        assert.equal(can('chef', 'orders.settle'), false);
        assert.equal(can('chef', 'shifts.use'), false);
    });

    test('admin: every permission', () => {
        for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) assert.equal(can('admin', p), true, p);
    });

    test('kiosk screen: menu, place orders, Orders board — never take payment', () => {
        assert.equal(can('kiosk', 'menu.view'), true);
        assert.equal(can('kiosk', 'orders.create'), true);
        assert.equal(can('kiosk', 'orders.board'), true);
        assert.equal(can('kiosk', 'orders.settle'), false);
        assert.equal(can('kiosk', 'kds.use'), false);
    });

    test('kitchen screen: the KDS and the board only', () => {
        assert.equal(can('kds', 'kds.use'), true);
        assert.equal(can('kds', 'orders.board'), true);
        assert.equal(can('kds', 'orders.create'), false);
    });

    test('nobody signed in can do nothing', () => {
        assert.equal(can(null, 'menu.view'), false);
        assert.equal(can(undefined, 'orders.board'), false);
    });
});
