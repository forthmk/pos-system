import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockModule } from './test-utils';

// Sold out / back in (design decision 19) for menu items and extras.

const items = mockModule(__dirname, '../modules/menu-items/menu-items.repository', {
    getWithStore: async () => ({ id: 4, sku: 'B4', name: 'Classic Cheeseburger', is_available: 1, store_id: 1 }),
    setAvailability: async () => undefined,
});
const addons = mockModule(__dirname, '../modules/addons/addons.repository', {
    getById: async () => ({ id: 2, name: 'Mini Swirl Sundae', is_available: 1, store_id: 1 }),
    setAvailability: async () => undefined,
});

const itemService: Record<string, any> = require('../modules/menu-items/menu-items.service');
const addonService: Record<string, any> = require('../modules/addons/addons.service');
const status = (code: number) => (err: any) => err.statusCode === code;

describe('menu-items.setAvailability', () => {
    beforeEach(() => items.reset());

    test('marks an item sold out', async () => {
        const res = await itemService.setAvailability(4, 1, false);
        assert.deepEqual(res, { id: 4, sku: 'B4', name: 'Classic Cheeseburger', available: false });
        assert.deepEqual(items.calls.setAvailability[0], [4, false]);
    });

    test('unknown item, or another store’s, is 404 and nothing changes', async () => {
        items.repository._getWithStore = async () => undefined;
        await assert.rejects(itemService.setAvailability(99, 1, false), status(404));
        items.repository._getWithStore = async () => ({ id: 4, sku: 'B4', name: 'x', is_available: 1, store_id: 2 });
        await assert.rejects(itemService.setAvailability(4, 1, false), status(404));
        assert.equal(items.calls.setAvailability.length, 0);
    });
});

describe('addons.setAvailability', () => {
    beforeEach(() => addons.reset());

    test('puts an extra back on', async () => {
        const res = await addonService.setAvailability(2, 1, true);
        assert.deepEqual(res, { id: 2, name: 'Mini Swirl Sundae', available: true });
        assert.deepEqual(addons.calls.setAvailability[0], [2, true]);
    });

    test('another store’s extra is 404', async () => {
        addons.repository._getById = async () => ({ id: 2, name: 'x', is_available: 1, store_id: 7 });
        await assert.rejects(addonService.setAvailability(2, 1, true), status(404));
    });
});
