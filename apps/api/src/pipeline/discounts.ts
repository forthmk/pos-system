import type { DiscountInput, DiscountType } from '@pos-system/shared';
import ApiError from '../apiError';
import { db } from '../services/database.service';
import type { Discount } from './pricing';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · discounts — turns the cashier's discount button into the
 * pricing rule and the order_discounts row (design §7.5, §7.6, decisions
 * 11–12). One discount per order.
 *
 *   REGULAR          none
 *   STUDENT          percent (discount_types.rate)
 *   SENIOR / PWD     senior_pwd: ID number (≥ 4) + name required; diners /
 *                    qualified for a group (qualified ≤ diners)
 *   VOUCHER          the voucher code: active, within its dates, uses left;
 *                    percent or fixed; min spend checked once priced
 * ────────────────────────────────────────────────────────────────────────── */

export const queries = {
    types: (storeId: number) =>
        db
            .selectFrom('discount_types')
            .select(['id', 'code', 'name', 'kind', 'rate', 'requires_id'])
            .where('store_id', '=', storeId)
            .where('is_active', '=', 1)
            .orderBy('sort_order')
            .execute(),
    type: (storeId: number, code: string) =>
        db
            .selectFrom('discount_types')
            .select(['id', 'code', 'name', 'kind', 'rate', 'requires_id'])
            .where('store_id', '=', storeId)
            .where('code', '=', code)
            .where('is_active', '=', 1)
            .executeTakeFirst(),
    voucher: (storeId: number, code: string) =>
        db.selectFrom('vouchers').selectAll().where('store_id', '=', storeId).where('code', '=', code).executeTakeFirst(),
};

export const listTypes = async (storeId: number): Promise<DiscountType[]> =>
    (await queries.types(storeId)).map((t) => ({ id: t.id, code: t.code, name: t.name, kind: t.kind, rate: Number(t.rate), requires_id: !!t.requires_id }));

export interface ResolvedDiscount {
    pricing: Discount;
    /** The receipt label: "Student (10%)", "Senior", "Voucher BITE50". */
    label: string;
    record: {
        discount_type_id: number;
        voucher_id: number | null;
        rate: number;
        id_number: string | null;
        holder_name: string | null;
        diners: number;
        qualified: number;
    };
    /** Voucher minimum spend in pesos, checked against the subtotal. */
    minSpend: number;
}

const invalidVoucher = (reason: string) => new ApiError(reason, 409, 'discount', { code: 'VOUCHER_INVALID', reason });

/** null = no discount (Regular, or nothing chosen). */
export async function resolveDiscount(storeId: number, input: DiscountInput | undefined, now = new Date()): Promise<ResolvedDiscount | null> {
    if (!input || input.type === 'REGULAR') return null;
    const type = await queries.type(storeId, input.type);
    if (!type || type.kind === 'none') {
        if (type) return null;
        throw new ApiError('Unknown discount.', 400, 'discount');
    }
    const base = { discount_type_id: type.id, voucher_id: null, id_number: null, holder_name: null, diners: 1, qualified: 1 };

    if (type.kind === 'percent') {
        const rate = Number(type.rate);
        return { pricing: { kind: 'percent', rate }, label: `${type.name} (${Math.round(rate * 100)}%)`, record: { ...base, rate }, minSpend: 0 };
    }

    if (type.kind === 'senior_pwd') {
        const idNumber = input.id_number?.trim() ?? '';
        const holder = input.holder_name?.trim() ?? '';
        if (idNumber.length < 4) throw new ApiError(`Type the ${type.name} ID number.`, 400, 'discount.id_number');
        if (!holder) throw new ApiError(`Type the name on the ${type.name} ID.`, 400, 'discount.holder_name');
        const diners = input.diners ?? 1;
        const qualified = input.qualified ?? 1;
        if (qualified > diners) throw new ApiError('More qualified diners than diners.', 400, 'discount.qualified');
        const rate = Number(type.rate);
        return {
            pricing: { kind: 'senior_pwd', rate, diners, qualified },
            label: type.name,
            record: { ...base, rate, id_number: idNumber, holder_name: holder, diners, qualified },
            minSpend: 0,
        };
    }

    // voucher
    const code = input.code?.trim().toUpperCase() ?? '';
    if (!code) throw new ApiError('Type the voucher code.', 400, 'discount.code');
    const v = await queries.voucher(storeId, code);
    if (!v || !v.is_active) throw invalidVoucher('This voucher code does not exist.');
    if (v.valid_from && now < new Date(v.valid_from)) throw invalidVoucher('This voucher is not valid yet.');
    if (v.valid_to && now > new Date(v.valid_to)) throw invalidVoucher('This voucher has expired.');
    if (v.max_uses !== null && v.used_count >= v.max_uses) throw invalidVoucher('This voucher has been used up.');
    const value = Number(v.value);
    return {
        pricing: v.kind === 'percent' ? { kind: 'percent', rate: value / 100 } : { kind: 'fixed', value },
        label: `Voucher ${v.code}`,
        record: { ...base, voucher_id: v.id, rate: v.kind === 'percent' ? value / 100 : 0 },
        minSpend: Number(v.min_spend),
    };
}

export function assertMinSpend(discount: ResolvedDiscount | null, subtotal: number) {
    if (discount && subtotal < discount.minSpend) throw invalidVoucher(`This voucher needs a minimum spend of ₱${discount.minSpend}.`);
}
