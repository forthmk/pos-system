import type { DiscountInput, DiscountType, MenuCategory, OrderSummary, VoucherCheck } from '@shared/model';
import { priceOrder, type Discount, type PricedOrder } from '@shared/utils';
import { kioskReducer, priceLines, type CartLine, type PricedLine } from '../Kiosk/cart';

/* ──────────────────────────────────────────────────────────────────────────
 * The register's ticket (design §5.3–5.4). Either a walk-in ticket the
 * cashier rings up (lines = picks, like the kiosk cart) or a scanned kiosk
 * order (its saved lines, kiosk prices kept). The totals preview uses the
 * shared pricing engine — the same code the API charges with.
 * ────────────────────────────────────────────────────────────────────────── */

export type Method = 'gcash' | 'cash' | 'card';

/** The chosen discount, with what the preview needs (rate / voucher). */
export type TicketDiscount =
    | { type: 'STUDENT' }
    | { type: 'SENIOR' | 'PWD'; id_number: string; holder_name: string; diners: number; qualified: number }
    | { type: 'VOUCHER'; code: string; voucher: VoucherCheck };

export interface Ticket {
    mode: 'IN' | 'OUT';
    lines: CartLine[];
    scanned: { order: OrderSummary; lockedUntil: string } | null;
    discount: TicketDiscount | null;
    method: Method;
    tendered: string;
    reference: string;
    /** One per ticket: a retried PROCEED can't charge twice. */
    clientRef: string | null;
}

export const emptyTicket: Ticket = { mode: 'IN', lines: [], scanned: null, discount: null, method: 'cash', tendered: '', reference: '', clientRef: null };

export type TicketAction =
    | { type: 'mode'; mode: 'IN' | 'OUT' }
    | { type: 'add'; menu_item_id: number; addon_ids: number[]; quantity: number }
    | { type: 'quantity'; key: string; quantity: number }
    | { type: 'scanned'; order: OrderSummary; lockedUntil: string }
    | { type: 'discount'; discount: TicketDiscount | null }
    | { type: 'method'; method: Method }
    | { type: 'tendered'; value: string }
    | { type: 'reference'; value: string }
    | { type: 'clientRef'; value: string }
    | { type: 'clear' };

export function ticketReducer(t: Ticket, a: TicketAction): Ticket {
    switch (a.type) {
        case 'mode':
            return { ...t, mode: a.mode };
        case 'add':
        case 'quantity': {
            // Same line rules as the kiosk cart (item + same extras merge; 0 removes).
            const cart = kioskReducer(
                { mode: t.mode, language: 'en', payment: t.method, lines: t.lines },
                a.type === 'add' ? { type: 'add', menu_item_id: a.menu_item_id, addon_ids: a.addon_ids, quantity: a.quantity } : { type: 'setQuantity', key: a.key, quantity: a.quantity },
            );
            return { ...t, lines: cart.lines, clientRef: null };
        }
        case 'scanned':
            return { ...emptyTicket, mode: a.order.dining_mode, method: a.order.payment_method, scanned: { order: a.order, lockedUntil: a.lockedUntil } };
        case 'discount':
            return { ...t, discount: a.discount, clientRef: null };
        case 'method':
            return { ...t, method: a.method, clientRef: null };
        case 'tendered':
            return { ...t, tendered: a.value };
        case 'reference':
            return { ...t, reference: a.value };
        case 'clientRef':
            return { ...t, clientRef: a.value };
        case 'clear':
            return emptyTicket;
    }
}

/* ── reading the ticket ────────────────────────────────────────────────── */

export interface TicketLineView {
    key: string;
    name: string;
    extras: string[];
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    unavailable: boolean;
    /** Walk-in lines can be changed; a scanned kiosk order's lines can't (here). */
    editable: boolean;
}

export function pricingDiscount(d: TicketDiscount | null, types: DiscountType[] | undefined): Discount | undefined {
    if (!d) return undefined;
    const type = types?.find((x) => x.code === d.type);
    if (d.type === 'STUDENT') return { kind: 'percent', rate: type?.rate ?? 0.1 };
    if (d.type === 'VOUCHER') return d.voucher.kind === 'fixed' ? { kind: 'fixed', value: d.voucher.value } : { kind: 'percent', rate: d.voucher.value / 100 };
    return { kind: 'senior_pwd', rate: type?.rate ?? 0.2, diners: d.diners, qualified: d.qualified };
}

export function discountLabel(d: TicketDiscount | null, types: DiscountType[] | undefined): string {
    if (!d) return 'Regular Rate';
    const type = types?.find((x) => x.code === d.type);
    if (d.type === 'STUDENT') return `${type?.name ?? 'Student'} (${Math.round((type?.rate ?? 0.1) * 100)}%)`;
    if (d.type === 'VOUCHER') return `Voucher ${d.code}`;
    return `${type?.name ?? d.type}${d.diners > 1 ? ` (${d.qualified} of ${d.diners})` : ''}`;
}

export function readTicket(t: Ticket, categories: MenuCategory[] | undefined, types: DiscountType[] | undefined): { lines: TicketLineView[]; priced: PricedOrder } {
    const discount = pricingDiscount(t.discount, types);
    if (t.scanned) {
        const o = t.scanned.order;
        const priced = priceOrder(
            o.lines.map((l) => ({ unit_price: l.unit_price, addon_prices: l.addons.map((a) => a.price), quantity: l.quantity })),
            discount,
        );
        return {
            priced,
            lines: o.lines.map((l, i) => ({
                key: `scanned-${i}`,
                name: l.name,
                extras: l.addons.map((a) => a.name),
                unitPrice: priced.lines[i].unit_price + priced.lines[i].addons_total,
                quantity: l.quantity,
                lineTotal: priced.lines[i].line_total,
                unavailable: false,
                editable: false,
            })),
        };
    }
    const lines: PricedLine[] = priceLines(t.lines, categories);
    const priced = priceOrder(
        lines.map((l) => ({ unit_price: l.item?.price ?? 0, addon_prices: l.addons.map((a) => a.price), quantity: l.quantity })),
        discount,
    );
    return {
        priced,
        lines: lines.map((l) => ({
            key: l.key,
            name: l.item?.name ?? '—',
            extras: l.addons.map((a) => a.name),
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            unavailable: l.unavailable,
            editable: true,
        })),
    };
}

/** What PROCEED sends as the discount. */
export function discountInput(d: TicketDiscount | null): DiscountInput | undefined {
    if (!d) return undefined;
    if (d.type === 'STUDENT') return { type: 'STUDENT' };
    if (d.type === 'VOUCHER') return { type: 'VOUCHER', code: d.code };
    return { type: d.type, id_number: d.id_number, holder_name: d.holder_name, diners: d.diners, qualified: d.qualified };
}
