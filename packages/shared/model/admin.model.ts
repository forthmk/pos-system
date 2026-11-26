import { Type, type Static, type TProperties } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { ROLES } from '../utils/permissions';

/* ──────────────────────────────────────────────────────────────────────────
 * Admin setup (design §8.1 /api/admin/*, decisions 9, 11–12, 19): the menu
 * with its Chinese / Korean names, extras, discount buttons, vouchers,
 * staff, screens (terminals + kitchen stations) and store settings.
 *
 * Nothing here is ever deleted — it is switched off (`is_active: false`), so
 * past orders, receipts and Z-readings keep pointing at real rows.
 * ────────────────────────────────────────────────────────────────────────── */

const optBool = Type.Optional(Type.Boolean());
const money = Type.Number({ minimum: 0, maximum: 100_000 });

/** Chinese / Korean names; an empty name removes it (the kiosk then shows English). */
const NameT = StrictObject({ name: Type.String({ maxLength: 120 }), description: Type.Optional(Type.String({ maxLength: 500 })) });
export const TranslationsSchema = StrictObject({ zh: Type.Optional(NameT), ko: Type.Optional(NameT) });
export type Translations = Static<typeof TranslationsSchema>;

/* ── menu ──────────────────────────────────────────────────────────────── */

export const CategoryBodySchema = StrictObject({
    code: Type.String({ minLength: 1, maxLength: 5, pattern: '^[A-Za-z0-9]+$' }),
    name: Type.String({ minLength: 1, maxLength: 60 }),
    sort_order: Type.Optional(Type.Integer({ minimum: 0, maximum: 9999 })),
    is_active: optBool,
    kds_station_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
    translations: Type.Optional(TranslationsSchema),
});
export type CategoryBody = Static<typeof CategoryBodySchema>;

export const ItemAddonLinkSchema = StrictObject({ addon_id: Type.Integer({ minimum: 1 }), price_override: Type.Optional(Type.Union([money, Type.Null()])) });

export const ItemBodySchema = StrictObject({
    category_id: Type.Integer({ minimum: 1 }),
    sku: Type.String({ minLength: 1, maxLength: 10, pattern: '^[A-Za-z0-9-]+$' }),
    name: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
    price: money,
    is_bestseller: optBool,
    is_combo: optBool,
    is_active: optBool,
    sort_order: Type.Optional(Type.Integer({ minimum: 0, maximum: 9999 })),
    /** The extras offered with this item, in order (replaces the list). */
    addons: Type.Optional(Type.Array(ItemAddonLinkSchema, { maxItems: 30 })),
    translations: Type.Optional(TranslationsSchema),
});
export type ItemBody = Static<typeof ItemBodySchema>;

export const AddonBodySchema = StrictObject({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    price: money,
    is_active: optBool,
    translations: Type.Optional(TranslationsSchema),
});
export type AddonBody = Static<typeof AddonBodySchema>;

export interface AdminTranslations {
    zh: { name: string; description: string | null } | null;
    ko: { name: string; description: string | null } | null;
}
export interface AdminItem {
    id: number;
    category_id: number;
    sku: string;
    name: string;
    description: string | null;
    price: number;
    is_bestseller: boolean;
    is_combo: boolean;
    is_available: boolean;
    is_active: boolean;
    sort_order: number;
    addons: { addon_id: number; price_override: number | null }[];
    translations: AdminTranslations;
}
export interface AdminCategory {
    id: number;
    code: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    kds_station_id: number | null;
    translations: AdminTranslations;
    items: AdminItem[];
}
export interface AdminAddon {
    id: number;
    name: string;
    price: number;
    is_available: boolean;
    is_active: boolean;
    translations: AdminTranslations;
}
/** GET /admin/menu — everything, switched-off rows included. */
export interface AdminMenu {
    categories: AdminCategory[];
    addons: AdminAddon[];
    stations: KdsStationRow[];
}

/* ── discounts & vouchers ──────────────────────────────────────────────── */

/** Code and kind stay fixed (pricing depends on them); the Student % can change, Senior / PWD 20% is law. */
export const DiscountTypeBodySchema = StrictObject({
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 60 })),
    rate: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    sort_order: Type.Optional(Type.Integer({ minimum: 0, maximum: 9999 })),
    is_active: optBool,
});
export type DiscountTypeBody = Static<typeof DiscountTypeBodySchema>;

export interface DiscountTypeRow {
    id: number;
    code: string;
    name: string;
    kind: 'none' | 'percent' | 'senior_pwd' | 'voucher';
    rate: number;
    requires_id: boolean;
    sort_order: number;
    is_active: boolean;
    rate_editable: boolean;
}

export const VoucherBodySchema = StrictObject({
    code: Type.String({ minLength: 3, maxLength: 40, pattern: '^[A-Za-z0-9_-]+$' }),
    kind: Type.Union([Type.Literal('percent'), Type.Literal('fixed')]),
    /** percent: 1–100 (% off); fixed: pesos off. */
    value: Type.Number({ exclusiveMinimum: 0, maximum: 100_000 }),
    min_spend: Type.Optional(money),
    valid_from: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
    valid_to: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
    max_uses: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 1_000_000 }), Type.Null()])),
    is_active: optBool,
});
export type VoucherBody = Static<typeof VoucherBodySchema>;

export interface VoucherRow {
    id: number;
    code: string;
    kind: 'percent' | 'fixed';
    value: number;
    min_spend: number;
    valid_from: string | null;
    valid_to: string | null;
    max_uses: number | null;
    used_count: number;
    is_active: boolean;
}

/* ── staff ─────────────────────────────────────────────────────────────── */

const pin = Type.String({ pattern: '^[0-9]{4,8}$' });
export const CreateUserBodySchema = StrictObject({
    username: Type.String({ minLength: 3, maxLength: 60, pattern: '^[A-Za-z0-9._-]+$' }),
    name: Type.String({ minLength: 1, maxLength: 120 }),
    role: Type.Union(ROLES.map((r) => Type.Literal(r))),
    pin,
});
export type CreateUserBody = Static<typeof CreateUserBodySchema>;

export const UpdateUserBodySchema = StrictObject({
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    role: Type.Optional(Type.Union(ROLES.map((r) => Type.Literal(r)))),
    is_active: optBool,
    /** A new PIN (4–8 digits); the old one stops working. */
    pin: Type.Optional(pin),
});
export type UpdateUserBody = Static<typeof UpdateUserBodySchema>;

export interface UserRow {
    id: number;
    username: string;
    name: string;
    role: (typeof ROLES)[number];
    is_active: boolean;
    last_login_at: string | null;
}

/* ── screens ───────────────────────────────────────────────────────────── */

export const CreateTerminalBodySchema = StrictObject({
    code: Type.String({ minLength: 2, maxLength: 20, pattern: '^[A-Za-z0-9-]+$' }),
    type: Type.Union([Type.Literal('kiosk'), Type.Literal('pos'), Type.Literal('kds')]),
    name: Type.String({ minLength: 1, maxLength: 60 }),
    kds_station_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
});
export type CreateTerminalBody = Static<typeof CreateTerminalBodySchema>;

export const UpdateTerminalBodySchema = StrictObject({
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 60 })),
    kds_station_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
    is_active: optBool,
});
export type UpdateTerminalBody = Static<typeof UpdateTerminalBodySchema>;

export interface TerminalRow {
    id: number;
    code: string;
    type: 'kiosk' | 'pos' | 'kds';
    name: string;
    kds_station_id: number | null;
    is_active: boolean;
    paired: boolean;
    last_seen_at: string | null;
}

export const StationBodySchema = StrictObject({
    code: Type.String({ minLength: 2, maxLength: 20, pattern: '^[A-Za-z0-9-]+$' }),
    name: Type.String({ minLength: 1, maxLength: 60 }),
    is_active: optBool,
});
export type StationBody = Static<typeof StationBodySchema>;

export interface KdsStationRow {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
}

/* ── settings ──────────────────────────────────────────────────────────── */

/**
 * The store settings an admin may change, with safe limits. VAT 12% and the
 * Senior / PWD 20% are fixed by law (shown, not editable); kiosk online
 * payment stays off in version 1 (decision 1).
 */
export const SETTINGS_SPEC = [
    { key: 'kds_delay_minutes', label: 'Kitchen: ticket turns red after', unit: 'minutes', min: 1, max: 60 },
    { key: 'kds_recall_minutes', label: 'Kitchen: recall allowed for', unit: 'minutes', min: 0, max: 60 },
    { key: 'kiosk_idle_seconds', label: 'Kiosk: ask "Still there?" after', unit: 'seconds', min: 15, max: 600 },
    { key: 'kiosk_reset_seconds', label: 'Kiosk: Order Sent screen stays for', unit: 'seconds', min: 3, max: 120 },
    { key: 'awaiting_payment_expiry_minutes', label: 'Kiosk slip: pay at the counter within', unit: 'minutes', min: 5, max: 240 },
    { key: 'order_lock_minutes', label: 'Register: a scanned slip is held for', unit: 'minutes', min: 1, max: 30 },
    { key: 'scan_max_key_gap_ms', label: 'Barcode scanner: max gap between keys', unit: 'ms', min: 20, max: 200 },
] as const;
export type SettingKey = (typeof SETTINGS_SPEC)[number]['key'];

export const SettingsBodySchema = StrictObject(
    Object.fromEntries(SETTINGS_SPEC.map((s) => [s.key, Type.Optional(Type.Integer({ minimum: s.min, maximum: s.max }))])) as TProperties,
);
export type SettingsBody = Partial<Record<SettingKey, number>>;

export interface StoreSettings {
    store: { code: string; name: string };
    values: Record<SettingKey, number>;
    /** Fixed by law / version 1, shown only. */
    fixed: { vat_rate: number; senior_pwd_rate: number; kiosk_online_payment: string };
}
