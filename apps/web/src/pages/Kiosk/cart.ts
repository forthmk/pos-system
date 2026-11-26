import type { Language, MenuAddon, MenuCategory, MenuItem } from '@shared/model';

// The kiosk cart (design §5.1 kiosk rules, §7.6). It holds only what the
// customer picked — item IDs, quantities, extra IDs — never prices: the
// figures shown are worked out from the current menu, and the server prices
// the order again when it is placed (QB-005).

export type DiningMode = 'IN' | 'OUT';
export type PaymentMethod = 'gcash' | 'cash' | 'card';

export interface CartLine {
    /** item + set of extras: the same pair adds to one line (§5.1). */
    key: string;
    menu_item_id: number;
    addon_ids: number[];
    quantity: number;
}

export interface KioskState {
    mode: DiningMode | null;
    language: Language;
    payment: PaymentMethod;
    lines: CartLine[];
}

export const MAX_QTY = 99;

export const lineKey = (menuItemId: number, addonIds: number[]) => `${menuItemId}:${[...addonIds].sort((a, b) => a - b).join(',')}`;

export type KioskAction =
    | { type: 'setMode'; mode: DiningMode }
    | { type: 'setLanguage'; language: Language }
    | { type: 'setPayment'; payment: PaymentMethod }
    | { type: 'add'; menu_item_id: number; addon_ids: number[]; quantity: number }
    | { type: 'setQuantity'; key: string; quantity: number }
    | { type: 'reset' };

export const initialKioskState: KioskState = { mode: null, language: 'en', payment: 'gcash', lines: [] };

export function kioskReducer(state: KioskState, action: KioskAction): KioskState {
    switch (action.type) {
        case 'setMode':
            return { ...state, mode: action.mode };
        case 'setLanguage':
            return { ...state, language: action.language };
        case 'setPayment':
            return { ...state, payment: action.payment };
        case 'add': {
            const key = lineKey(action.menu_item_id, action.addon_ids);
            const existing = state.lines.find((l) => l.key === key);
            if (existing) {
                return {
                    ...state,
                    lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + action.quantity) } : l)),
                };
            }
            const addon_ids = [...action.addon_ids].sort((a, b) => a - b);
            return { ...state, lines: [...state.lines, { key, menu_item_id: action.menu_item_id, addon_ids, quantity: Math.min(MAX_QTY, action.quantity) }] };
        }
        case 'setQuantity':
            return {
                ...state,
                // 0 removes the line (§5.1).
                lines:
                    action.quantity <= 0
                        ? state.lines.filter((l) => l.key !== action.key)
                        : state.lines.map((l) => (l.key === action.key ? { ...l, quantity: Math.min(MAX_QTY, action.quantity) } : l)),
            };
        case 'reset':
            return initialKioskState;
    }
}

/* ── Reading the cart against the menu ─────────────────────────────────── */

export interface PricedLine extends CartLine {
    item: MenuItem | undefined;
    addons: MenuAddon[];
    /** item price + extras, for one. */
    unitPrice: number;
    lineTotal: number;
    /** Gone from the menu or sold out since it was added. */
    unavailable: boolean;
}

const cents = (pesos: number) => Math.round(pesos * 100);

export function priceLines(lines: CartLine[], categories: MenuCategory[] | undefined): PricedLine[] {
    const items = new Map<number, MenuItem>();
    for (const c of categories ?? []) for (const i of c.items) items.set(i.id, i);
    return lines.map((line) => {
        const item = items.get(line.menu_item_id);
        const addons = line.addon_ids.map((id) => item?.addons.find((a) => a.id === id)).filter((a): a is MenuAddon => !!a);
        const unitCents = cents(item?.price ?? 0) + addons.reduce((t, a) => t + cents(a.price), 0);
        const unavailable = !item || !item.available || addons.length !== line.addon_ids.length || addons.some((a) => !a.available);
        return { ...line, item, addons, unitPrice: unitCents / 100, lineTotal: (unitCents * line.quantity) / 100, unavailable };
    });
}

export const cartTotals = (lines: PricedLine[]) => ({
    count: lines.reduce((t, l) => t + l.quantity, 0),
    total: lines.reduce((t, l) => t + cents(l.lineTotal), 0) / 100,
});

/** ₱65 / ₱185.50 — whole pesos without decimals, like the UI references. */
export const peso = (amount: number) =>
    `₱${Number.isInteger(amount) ? amount.toLocaleString('en-PH') : amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "Spicy Burger (+ Crispy Fries (S))" */
export const lineName = (line: PricedLine) =>
    `${line.item?.name ?? '—'}${line.addons.length ? ` (+ ${line.addons.map((a) => a.name).join(', ')})` : ''}`;
