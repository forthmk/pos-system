import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPayment } from '../pipeline/payments';

// pipeline/payments (design §7.5, §7.6, decision 17).

describe('pipeline/payments · checkPayment', () => {
    test('cash: change = tendered − total (design example B: ₱500 on ₱306 → ₱194)', () => {
        assert.deepEqual(checkPayment({ method: 'cash', tendered: 500 }, 306), { method: 'cash', amount: 306, tendered: 500, change_due: 194, reference_no: null });
    });

    test('cash: exact is fine; short or missing is refused', () => {
        assert.equal(checkPayment({ method: 'cash', tendered: 306 }, 306).change_due, 0);
        assert.throws(() => checkPayment({ method: 'cash', tendered: 305.99 }, 306), (e: any) => e.statusCode === 422 && e.value.code === 'INSUFFICIENT_CASH');
        assert.throws(() => checkPayment({ method: 'cash' }, 306), (e: any) => e.statusCode === 400);
    });

    test('GCash / card: a 6–30 character reference number is required', () => {
        assert.equal(checkPayment({ method: 'gcash', reference_no: ' 5012 345 678 ' }, 300).reference_no, '5012 345 678');
        assert.equal(checkPayment({ method: 'card', reference_no: 'AUTH-0099' }, 300).tendered, null);
        assert.throws(() => checkPayment({ method: 'gcash' }, 300), (e: any) => e.statusCode === 400);
        assert.throws(() => checkPayment({ method: 'card', reference_no: '12345' }, 300), (e: any) => e.statusCode === 400);
        assert.throws(() => checkPayment({ method: 'card', reference_no: 'ref#123' }, 300), (e: any) => e.statusCode === 400);
    });
});
