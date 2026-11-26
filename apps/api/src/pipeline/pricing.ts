/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · pricing — the only place an order's money is worked out
 * (design §7.6). Pure: no database, no HTTP. Everything is in centavos
 * (whole numbers) and every step is rounded half-up, so ₱0.01 never drifts.
 *
 *   line_total   = (unit_price + Σ extras) × quantity
 *   subtotal     = Σ line_total                       (prices include 12% VAT)
 *   Regular      no discount
 *   percent      discount = subtotal × rate           (Student 10%, % voucher)
 *   fixed        discount = lesser of value, subtotal (₱ voucher)
 *   senior_pwd   share = subtotal × qualified ÷ diners
 *                exempt base = share ÷ 1.12 · VAT removed = share − base
 *                discount = base × 20% · their part = base − discount
 *   total_due    = subtotal − discount (− VAT removed)
 *   VAT split    taxable part ÷ 1.12 = vatable sales, the rest is VAT
 * ────────────────────────────────────────────────────────────────────────── */

export const VAT_RATE = 0.12;

export type Discount =
    | { kind: 'none' }
    | { kind: 'percent'; rate: number }
    | { kind: 'fixed'; value: number }
    | { kind: 'senior_pwd'; rate: number; diners: number; qualified: number };

export interface PricingLine {
    /** Pesos, as stored (VAT-inclusive). */
    unit_price: number;
    addon_prices: number[];
    quantity: number;
}

export interface PricedLine {
    unit_price: number;
    addons_total: number;
    line_total: number;
}

export interface PricedOrder {
    lines: PricedLine[];
    item_count: number;
    subtotal: number;
    discount: { rate: number; base_amount: number; vat_removed: number; amount: number };
    discount_total: number;
    vatable_sales: number;
    vat_amount: number;
    vat_exempt_sales: number;
    total_due: number;
}

export const toCents = (pesos: number) => Math.round(pesos * 100);
const toPesos = (cents: number) => cents / 100;
const vatInclusiveBase = (cents: number) => Math.round(cents / (1 + VAT_RATE));

export function priceOrder(lines: PricingLine[], discount: Discount = { kind: 'none' }): PricedOrder {
    const priced = lines.map((l) => {
        const unit = toCents(l.unit_price);
        const addons = l.addon_prices.reduce((t, p) => t + toCents(p), 0);
        return { unit, addons, total: (unit + addons) * l.quantity };
    });
    const subtotal = priced.reduce((t, l) => t + l.total, 0);
    const item_count = lines.reduce((t, l) => t + l.quantity, 0);

    let rate = 0;
    let base = 0;
    let vatRemoved = 0;
    let amount = 0;
    let taxable = subtotal; // the part that still carries VAT
    let exempt = 0;

    if (discount.kind === 'percent') {
        rate = discount.rate;
        base = subtotal;
        amount = Math.round(subtotal * rate);
        taxable = subtotal - amount;
    } else if (discount.kind === 'fixed') {
        base = subtotal;
        amount = Math.min(toCents(discount.value), subtotal);
        taxable = subtotal - amount;
    } else if (discount.kind === 'senior_pwd') {
        rate = discount.rate;
        const share = Math.round((subtotal * discount.qualified) / discount.diners);
        exempt = vatInclusiveBase(share);
        base = exempt;
        vatRemoved = share - exempt;
        amount = Math.round(exempt * rate);
        taxable = subtotal - share;
    }

    const total = subtotal - amount - vatRemoved;
    const vatable = vatInclusiveBase(taxable);

    return {
        lines: priced.map((l) => ({ unit_price: toPesos(l.unit), addons_total: toPesos(l.addons), line_total: toPesos(l.total) })),
        item_count,
        subtotal: toPesos(subtotal),
        discount: { rate, base_amount: toPesos(base), vat_removed: toPesos(vatRemoved), amount: toPesos(amount) },
        discount_total: toPesos(amount),
        vatable_sales: toPesos(vatable),
        vat_amount: toPesos(taxable - vatable),
        vat_exempt_sales: toPesos(exempt),
        total_due: toPesos(total),
    };
}
