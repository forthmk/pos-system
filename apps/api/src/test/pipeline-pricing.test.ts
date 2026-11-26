import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { priceOrder } from '../pipeline/pricing';

// pipeline/pricing against the design's worked examples (§7.6, table "Worked examples").

const kioskCart = [
    { unit_price: 65, addon_prices: [], quantity: 3 }, // Golden Crispy Fries
    { unit_price: 150, addon_prices: [35], quantity: 3 }, // Spicy Burger + Crispy Fries (S)
    { unit_price: 45, addon_prices: [35], quantity: 2 }, // Iced Cola Fizz + Crispy Fries (S)
];
const counter = [
    { unit_price: 165, addon_prices: [], quantity: 1 }, // Double Smash Burger
    { unit_price: 175, addon_prices: [], quantity: 1 }, // Smoky Bacon Melt
];

describe('pipeline/pricing (design §7.6)', () => {
    test('A. kiosk cart from the mock-up: ₱910, 8 items, VAT 97.50', () => {
        const o = priceOrder(kioskCart);
        assert.deepEqual(o.lines, [
            { unit_price: 65, addons_total: 0, line_total: 195 },
            { unit_price: 150, addons_total: 35, line_total: 555 },
            { unit_price: 45, addons_total: 35, line_total: 160 },
        ]);
        assert.equal(o.item_count, 8);
        assert.equal(o.subtotal, 910);
        assert.equal(o.discount_total, 0);
        assert.equal(o.vatable_sales, 812.5);
        assert.equal(o.vat_amount, 97.5);
        assert.equal(o.total_due, 910);
    });

    test('B. Student 10% on ₱340 → ₱306, VAT 32.79', () => {
        const o = priceOrder(counter, { kind: 'percent', rate: 0.1 });
        assert.equal(o.discount_total, 34);
        assert.equal(o.total_due, 306);
        assert.equal(o.vatable_sales, 273.21);
        assert.equal(o.vat_amount, 32.79);
    });

    test('C. Senior eating alone on ₱340 → ₱242.86 (VAT removed 36.43, discount 60.71)', () => {
        const o = priceOrder(counter, { kind: 'senior_pwd', rate: 0.2, diners: 1, qualified: 1 });
        assert.deepEqual(o.discount, { rate: 0.2, base_amount: 303.57, vat_removed: 36.43, amount: 60.71 });
        assert.equal(o.total_due, 242.86);
        assert.equal(o.vat_exempt_sales, 303.57);
        assert.equal(o.vatable_sales, 0);
        assert.equal(o.vat_amount, 0);
    });

    test('D. 1 senior in a group of 4 → ₱315.71 (others pay 255.00 with VAT 27.32)', () => {
        const o = priceOrder(counter, { kind: 'senior_pwd', rate: 0.2, diners: 4, qualified: 1 });
        assert.deepEqual(o.discount, { rate: 0.2, base_amount: 75.89, vat_removed: 9.11, amount: 15.18 });
        assert.equal(o.total_due, 315.71);
        assert.equal(o.vatable_sales, 227.68);
        assert.equal(o.vat_amount, 27.32);
    });

    test('fixed voucher: ₱50 off, never more than the subtotal', () => {
        assert.equal(priceOrder(counter, { kind: 'fixed', value: 50 }).total_due, 290);
        const small = priceOrder([{ unit_price: 35, addon_prices: [], quantity: 1 }], { kind: 'fixed', value: 50 });
        assert.equal(small.discount_total, 35);
        assert.equal(small.total_due, 0);
    });

    test('centavos never drift: 3 × ₱33.33 + extra ₱0.01 = ₱100.02', () => {
        assert.equal(priceOrder([{ unit_price: 33.33, addon_prices: [0.01], quantity: 3 }]).total_due, 100.02);
    });
});
