import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockModule } from './test-utils';

// The kiosk menu in one call (design §5.1 kiosk rules, §8.1).

const { repository: repo, calls, reset } = mockModule(__dirname, '../modules/kiosk/kiosk.repository', {
    categories: async () => [
        { id: 2, code: 'B', name: 'Burger', name_t: '汉堡' },
        { id: 4, code: 'R', name: 'Drinks', name_t: null },
        { id: 9, code: 'X', name: 'Empty', name_t: null },
    ],
    items: async () => [
        { id: 5, category_id: 2, sku: 'B5', name: 'Spicy Burger', description: null, price: '150.00', image_url: null, is_bestseller: 0, is_combo: 0, is_available: 1, name_t: '香辣汉堡', description_t: null },
        { id: 3, category_id: 2, sku: 'B3', name: 'Smoky Bacon Melt', description: 'Bacon', price: '175.00', image_url: null, is_bestseller: 1, is_combo: 0, is_available: 0, name_t: null, description_t: null },
        { id: 15, category_id: 4, sku: 'R1', name: 'Iced Cola Fizz', description: null, price: '45.00', image_url: null, is_bestseller: 0, is_combo: 0, is_available: 1, name_t: null, description_t: null },
    ],
    itemAddons: async () => [
        { menu_item_id: 5, id: 1, name: 'Crispy Fries (S)', price: '35.00', price_override: null, is_available: 1, name_t: '小份薯条' },
        { menu_item_id: 5, id: 3, name: 'Chilled Cola Fizz', price: '30.00', price_override: '25.00', is_available: 0, name_t: null },
    ],
    settings: async () => [
        { key: 'kiosk_idle_seconds', value: '90' },
        { key: 'kiosk_online_payment', value: 'off' },
    ],
});

const service: Record<string, any> = require('../modules/kiosk/kiosk.service');

describe('kiosk.menu', () => {
    beforeEach(() => reset());

    test('reads the store’s menu in the asked language', async () => {
        await service.menu(1, 'zh');
        assert.deepEqual(calls.categories[0], [1, 'zh']);
        assert.deepEqual(calls.items[0], [1, 'zh']);
    });

    test('categories → items → extras, with translated names and English when missing', async () => {
        const m = await service.menu(1, 'zh');
        assert.equal(m.language, 'zh');
        assert.deepEqual(
            m.categories.map((c: any) => [c.code, c.name, c.items.map((i: any) => i.sku)]),
            [
                ['B', '汉堡', ['B5', 'B3']],
                ['R', 'Drinks', ['R1']],
            ],
        );
        const spicy = m.categories[0].items[0];
        assert.equal(spicy.name, '香辣汉堡');
        assert.equal(m.categories[0].items[1].name, 'Smoky Bacon Melt');
        assert.equal(spicy.addons[0].name, '小份薯条');
    });

    test('prices are numbers; an extra uses the item’s price_override', async () => {
        const m = await service.menu(1, 'en');
        const spicy = m.categories[0].items[0];
        assert.equal(spicy.price, 150);
        assert.deepEqual(spicy.addons.map((a: any) => a.price), [35, 25]);
    });

    test('sold-out items and extras stay on the menu, marked unavailable', async () => {
        const m = await service.menu(1, 'en');
        assert.equal(m.categories[0].items[1].available, false);
        assert.equal(m.categories[0].items[1].is_bestseller, true);
        assert.equal(m.categories[0].items[0].addons[1].available, false);
    });

    test('a category with no active items is left out', async () => {
        const m = await service.menu(1, 'en');
        assert.equal(m.categories.some((c: any) => c.code === 'X'), false);
    });

    test('kiosk settings, with the design defaults for missing keys', async () => {
        const m = await service.menu(1, 'en');
        assert.deepEqual(m.settings, { idle_seconds: 90, reset_seconds: 10, online_payment: false });
    });
});
