import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// pipeline/menu (design §5.1 kiosk rules, §7.6, decision 19): the menu the
// kiosk and the cashier read, and sold out / back in.

const menu: Record<string, any> = require('../pipeline/menu');
const original = { ...menu.queries };
let calls: Record<string, any[]> = {};

const stub = (name: string, impl: (...a: any[]) => any) => {
    menu.queries[name] = async (...args: any[]) => {
        (calls[name] ??= []).push(args);
        return impl(...args);
    };
};

beforeEach(() => {
    Object.assign(menu.queries, original);
    calls = {};
    stub('categories', () => [
        { id: 2, code: 'B', name: 'Burger', name_t: '汉堡' },
        { id: 4, code: 'R', name: 'Drinks', name_t: null },
        { id: 9, code: 'X', name: 'Empty', name_t: null },
    ]);
    stub('items', () => [
        { id: 5, category_id: 2, sku: 'B5', name: 'Spicy Burger', description: null, price: '150.00', image_url: null, is_bestseller: 0, is_combo: 0, is_available: 1, name_t: '香辣汉堡', description_t: null },
        { id: 3, category_id: 2, sku: 'B3', name: 'Smoky Bacon Melt', description: 'Bacon', price: '175.00', image_url: null, is_bestseller: 1, is_combo: 0, is_available: 0, name_t: null, description_t: null },
        { id: 15, category_id: 4, sku: 'R1', name: 'Iced Cola Fizz', description: null, price: '45.00', image_url: null, is_bestseller: 0, is_combo: 0, is_available: 1, name_t: null, description_t: null },
    ]);
    stub('itemAddons', () => [
        { menu_item_id: 5, id: 1, name: 'Crispy Fries (S)', price: '35.00', price_override: null, is_available: 1, name_t: '小份薯条' },
        { menu_item_id: 5, id: 3, name: 'Chilled Cola Fizz', price: '30.00', price_override: '25.00', is_available: 0, name_t: null },
    ]);
    stub('settings', () => [
        { key: 'kiosk_idle_seconds', value: '90' },
        { key: 'kiosk_online_payment', value: 'off' },
    ]);
    stub('itemStore', () => ({ id: 4, sku: 'B4', name: 'Classic Cheeseburger', store_id: 1 }));
    stub('addonStore', () => ({ id: 2, name: 'Mini Swirl Sundae', store_id: 1 }));
    stub('setItemAvailable', () => undefined);
    stub('setAddonAvailable', () => undefined);
});

const status = (code: number) => (err: any) => err.statusCode === code;

describe('pipeline/menu · readMenu', () => {
    test('reads the store’s menu in the asked language', async () => {
        await menu.readMenu(1, 'zh');
        assert.deepEqual(calls.categories[0], [1, 'zh']);
        assert.deepEqual(calls.items[0], [1, 'zh']);
    });

    test('categories → items → extras, translated names with English when missing; empty categories left out', async () => {
        const m = await menu.readMenu(1, 'zh');
        assert.deepEqual(
            m.categories.map((c: any) => [c.code, c.name, c.items.map((i: any) => i.sku)]),
            [
                ['B', '汉堡', ['B5', 'B3']],
                ['R', 'Drinks', ['R1']],
            ],
        );
        assert.equal(m.categories[0].items[0].name, '香辣汉堡');
        assert.equal(m.categories[0].items[1].name, 'Smoky Bacon Melt');
        assert.equal(m.categories[0].items[0].addons[0].name, '小份薯条');
    });

    test('prices are numbers; an extra uses the item’s price_override', async () => {
        const spicy = (await menu.readMenu(1, 'en')).categories[0].items[0];
        assert.equal(spicy.price, 150);
        assert.deepEqual(spicy.addons.map((a: any) => a.price), [35, 25]);
    });

    test('sold-out items and extras stay on the menu, marked unavailable', async () => {
        const m = await menu.readMenu(1, 'en');
        assert.equal(m.categories[0].items[1].available, false);
        assert.equal(m.categories[0].items[1].is_bestseller, true);
        assert.equal(m.categories[0].items[0].addons[1].available, false);
    });

    test('kiosk settings, with the design defaults for missing keys', async () => {
        assert.deepEqual((await menu.readMenu(1, 'en')).settings, { idle_seconds: 90, reset_seconds: 10, online_payment: false });
    });
});

describe('pipeline/menu · sold out / back in', () => {
    test('marks an item sold out', async () => {
        assert.deepEqual(await menu.setItemAvailability(4, 1, false), { id: 4, sku: 'B4', name: 'Classic Cheeseburger', available: false });
        assert.deepEqual(calls.setItemAvailable[0], [4, false]);
    });

    test('unknown item, or another store’s, is 404 and nothing changes', async () => {
        stub('itemStore', () => undefined);
        await assert.rejects(menu.setItemAvailability(99, 1, false), status(404));
        stub('itemStore', () => ({ id: 4, sku: 'B4', name: 'x', store_id: 2 }));
        await assert.rejects(menu.setItemAvailability(4, 1, false), status(404));
        assert.equal(calls.setItemAvailable, undefined);
    });

    test('puts an extra back on; another store’s extra is 404', async () => {
        assert.deepEqual(await menu.setAddonAvailability(2, 1, true), { id: 2, name: 'Mini Swirl Sundae', available: true });
        stub('addonStore', () => ({ id: 2, name: 'x', store_id: 7 }));
        await assert.rejects(menu.setAddonAvailability(2, 1, true), status(404));
    });
});
