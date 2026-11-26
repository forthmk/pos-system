import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// pipeline/discounts (design §7.5, §7.6, decisions 11–12).

const discounts: Record<string, any> = require('../pipeline/discounts');
const original = { ...discounts.queries };
const TYPES: Record<string, any> = {
    REGULAR: { id: 1, code: 'REGULAR', name: 'Regular Rate', kind: 'none', rate: '0', requires_id: 0 },
    STUDENT: { id: 4, code: 'STUDENT', name: 'Student', kind: 'percent', rate: '0.1000', requires_id: 0 },
    SENIOR: { id: 5, code: 'SENIOR', name: 'Senior', kind: 'senior_pwd', rate: '0.2000', requires_id: 1 },
    VOUCHER: { id: 3, code: 'VOUCHER', name: 'Voucher', kind: 'voucher', rate: '0', requires_id: 0 },
};
let voucher: any;
beforeEach(() => {
    Object.assign(discounts.queries, original);
    discounts.queries.type = async (_s: number, code: string) => TYPES[code];
    voucher = { id: 9, code: 'BITE50', kind: 'fixed', value: '50.00', min_spend: '300.00', valid_from: null, valid_to: null, max_uses: 100, used_count: 3, is_active: 1 };
    discounts.queries.voucher = async (_s: number, code: string) => (code === voucher.code ? voucher : undefined);
});
const status = (code: number) => (e: any) => e.statusCode === code;

describe('pipeline/discounts · resolveDiscount', () => {
    test('nothing or Regular → no discount', async () => {
        assert.equal(await discounts.resolveDiscount(1, undefined), null);
        assert.equal(await discounts.resolveDiscount(1, { type: 'REGULAR' }), null);
    });

    test('Student → 10% labelled "Student (10%)"', async () => {
        const d = await discounts.resolveDiscount(1, { type: 'STUDENT' });
        assert.deepEqual(d.pricing, { kind: 'percent', rate: 0.1 });
        assert.equal(d.label, 'Student (10%)');
    });

    test('Senior needs the ID number and name; a group share is checked', async () => {
        await assert.rejects(discounts.resolveDiscount(1, { type: 'SENIOR', holder_name: 'Juan' }), status(400));
        await assert.rejects(discounts.resolveDiscount(1, { type: 'SENIOR', id_number: 'QC-123456' }), status(400));
        await assert.rejects(discounts.resolveDiscount(1, { type: 'SENIOR', id_number: 'QC-123456', holder_name: 'Juan', diners: 2, qualified: 3 }), status(400));
        const d = await discounts.resolveDiscount(1, { type: 'SENIOR', id_number: ' QC-123456 ', holder_name: 'Juan Dela Cruz', diners: 4, qualified: 1 });
        assert.deepEqual(d.pricing, { kind: 'senior_pwd', rate: 0.2, diners: 4, qualified: 1 });
        assert.equal(d.record.id_number, 'QC-123456');
    });

    test('voucher: fixed ₱50, code case-insensitive, min spend checked', async () => {
        const d = await discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'bite50' });
        assert.deepEqual(d.pricing, { kind: 'fixed', value: 50 });
        assert.equal(d.record.voucher_id, 9);
        assert.throws(() => discounts.assertMinSpend(d, 299.99), (e: any) => e.value.code === 'VOUCHER_INVALID');
        discounts.assertMinSpend(d, 300);
    });

    test('voucher unknown, switched off, not yet / no longer valid, or used up → 409', async () => {
        const invalid = (e: any) => e.statusCode === 409 && e.value.code === 'VOUCHER_INVALID';
        await assert.rejects(discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'NOPE' }), invalid);
        voucher.is_active = 0;
        await assert.rejects(discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'BITE50' }), invalid);
        voucher.is_active = 1;
        voucher.valid_to = new Date(Date.now() - 1000);
        await assert.rejects(discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'BITE50' }), invalid);
        voucher.valid_to = null;
        voucher.valid_from = new Date(Date.now() + 86_400_000);
        await assert.rejects(discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'BITE50' }), invalid);
        voucher.valid_from = null;
        voucher.used_count = 100;
        await assert.rejects(discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'BITE50' }), invalid);
    });

    test('a percent voucher (value 15) → 15%', async () => {
        voucher.kind = 'percent';
        voucher.value = '15';
        assert.deepEqual((await discounts.resolveDiscount(1, { type: 'VOUCHER', code: 'BITE50' })).pricing, { kind: 'percent', rate: 0.15 });
    });

    test('unknown discount type → 400', async () => {
        await assert.rejects(discounts.resolveDiscount(1, { type: 'VIP' }), status(400));
    });
});
