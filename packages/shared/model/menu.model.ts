import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';

// The kiosk menu (design §8.1 GET /api/kiosk/menu?lang=en): categories →
// items → the extras each item offers, with names in the kiosk's language
// (English when a translation is missing) and sold-out flags. Prices are
// VAT-inclusive pesos.

export const LANGUAGES = ['en', 'zh', 'ko'] as const;
export type Language = (typeof LANGUAGES)[number];

export const KioskMenuQuerySchema = StrictObject({
    lang: Type.Optional(Type.Union(LANGUAGES.map((l) => Type.Literal(l)))),
});
export type KioskMenuQuery = Static<typeof KioskMenuQuerySchema>;

export interface MenuAddon {
    id: number;
    name: string;
    price: number;
    available: boolean;
}

export interface MenuItem {
    id: number;
    sku: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    is_bestseller: boolean;
    is_combo: boolean;
    available: boolean;
    addons: MenuAddon[];
}

export interface MenuCategory {
    id: number;
    code: string;
    name: string;
    items: MenuItem[];
}

export interface KioskMenu {
    language: Language;
    categories: MenuCategory[];
    /** Kiosk timings and options from the store settings (design appendix). */
    settings: { idle_seconds: number; reset_seconds: number; online_payment: boolean; pay_within_minutes: number };
}

// Sold out / back in (design decision 19): PATCH …/:id/availability.
export const AvailabilityBodySchema = StrictObject({ is_available: Type.Boolean() });
export type AvailabilityBody = Static<typeof AvailabilityBodySchema>;
