import { sql } from 'kysely';
import type { KioskMenu, Language, MenuAddon, MenuItem } from '@pos-system/shared';
import ApiError from '../apiError';
import { db } from '../services/database.service';
import { publish } from './live';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · menu — the one place the kiosk, the cashier and (later) the
 * order pricing read the menu from (design §5.1, §7.6, decision 19).
 *
 *   readMenu(store, lang)            categories → items → extras, names in
 *                                    `lang` (English when missing), extra
 *                                    price = price_override ?? price,
 *                                    sold-out kept with available: false
 *   setItemAvailability / setAddonAvailability   sold out / back in
 *
 * The SQL lives in `queries` (one object) so tests can swap a query out.
 * ────────────────────────────────────────────────────────────────────────── */

export const queries = {
    categories: (storeId: number, lang: Language) =>
        db
            .selectFrom('categories as c')
            .leftJoin('category_translations as t', (j) => j.onRef('t.category_id', '=', 'c.id').on('t.lang', '=', lang))
            .select(['c.id', 'c.code', 'c.name', 't.name as name_t'])
            .where('c.store_id', '=', storeId)
            .where('c.is_active', '=', 1)
            .orderBy('c.sort_order')
            .orderBy('c.id')
            .execute(),

    items: (storeId: number, lang: Language) =>
        db
            .selectFrom('menu_items as m')
            .innerJoin('categories as c', 'c.id', 'm.category_id')
            .leftJoin('menu_item_translations as t', (j) => j.onRef('t.menu_item_id', '=', 'm.id').on('t.lang', '=', lang))
            .select([
                'm.id',
                'm.category_id',
                'm.sku',
                'm.name',
                'm.description',
                'm.price',
                'm.image_url',
                'm.is_bestseller',
                'm.is_combo',
                'm.is_available',
                't.name as name_t',
                't.description as description_t',
            ])
            .where('c.store_id', '=', storeId)
            .where('c.is_active', '=', 1)
            .where('m.is_active', '=', 1)
            .orderBy('m.sort_order')
            .orderBy('m.id')
            .execute(),

    itemAddons: (storeId: number, lang: Language) =>
        db
            .selectFrom('menu_item_addons as mia')
            .innerJoin('addons as a', 'a.id', 'mia.addon_id')
            .leftJoin('addon_translations as t', (j) => j.onRef('t.addon_id', '=', 'a.id').on('t.lang', '=', lang))
            .select(['mia.menu_item_id', 'a.id', 'a.name', 'a.price', 'mia.price_override', 'a.is_available', 't.name as name_t'])
            .where('a.store_id', '=', storeId)
            .where('a.is_active', '=', 1)
            .orderBy('mia.sort_order')
            .orderBy('a.id')
            .execute(),

    settings: (storeId: number, keys: string[]) =>
        db.selectFrom('settings').select(['key', 'value']).where('store_id', '=', storeId).where('key', 'in', keys).execute(),

    itemStore: (id: number) =>
        db
            .selectFrom('menu_items as m')
            .innerJoin('categories as c', 'c.id', 'm.category_id')
            .select(['m.id', 'm.sku', 'm.name', 'c.store_id'])
            .where('m.id', '=', id)
            .executeTakeFirst(),

    addonStore: (id: number) => db.selectFrom('addons').select(['id', 'name', 'store_id']).where('id', '=', id).executeTakeFirst(),

    setItemAvailable: (id: number, available: boolean) =>
        db.updateTable('menu_items').set({ is_available: available ? 1 : 0, updated_at: sql`NOW()` }).where('id', '=', id).execute(),

    setAddonAvailable: (id: number, available: boolean) =>
        db.updateTable('addons').set({ is_available: available ? 1 : 0, updated_at: sql`NOW()` }).where('id', '=', id).execute(),
};

const KIOSK_SETTINGS = ['kiosk_idle_seconds', 'kiosk_reset_seconds', 'kiosk_online_payment', 'awaiting_payment_expiry_minutes'];

export async function readMenu(storeId: number, lang: Language): Promise<KioskMenu> {
    const [categories, items, addons, settingRows] = await Promise.all([
        queries.categories(storeId, lang),
        queries.items(storeId, lang),
        queries.itemAddons(storeId, lang),
        queries.settings(storeId, KIOSK_SETTINGS),
    ]);

    const addonsByItem = new Map<number, MenuAddon[]>();
    for (const a of addons) {
        const list = addonsByItem.get(a.menu_item_id) ?? [];
        list.push({ id: a.id, name: a.name_t ?? a.name, price: Number(a.price_override ?? a.price), available: !!a.is_available });
        addonsByItem.set(a.menu_item_id, list);
    }

    const itemsByCategory = new Map<number, MenuItem[]>();
    for (const m of items) {
        const list = itemsByCategory.get(m.category_id) ?? [];
        list.push({
            id: m.id,
            sku: m.sku,
            name: m.name_t ?? m.name,
            description: m.description_t ?? m.description ?? null,
            price: Number(m.price),
            image_url: m.image_url ?? null,
            is_bestseller: !!m.is_bestseller,
            is_combo: !!m.is_combo,
            available: !!m.is_available,
            addons: addonsByItem.get(m.id) ?? [],
        });
        itemsByCategory.set(m.category_id, list);
    }

    const setting = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
    return {
        language: lang,
        categories: categories
            .map((c) => ({ id: c.id, code: c.code, name: c.name_t ?? c.name, items: itemsByCategory.get(c.id) ?? [] }))
            .filter((c) => c.items.length > 0),
        settings: {
            idle_seconds: Number(setting.kiosk_idle_seconds ?? 60),
            reset_seconds: Number(setting.kiosk_reset_seconds ?? 10),
            online_payment: setting.kiosk_online_payment === 'on',
            // "Bring this slip to the counter within N minutes" (design §5.9).
            pay_within_minutes: Number(setting.awaiting_payment_expiry_minutes ?? 30),
        },
    };
}

/** Sold out / back in for a menu item of this store. */
export async function setItemAvailability(id: number, storeId: number, available: boolean) {
    const item = await queries.itemStore(id);
    if (!item || item.store_id !== storeId) throw new ApiError('Menu item not found.', 404);
    await queries.setItemAvailable(id, available);
    publish(storeId, 'menu.availability', { kind: 'item', id: item.id, available });
    return { id: item.id, sku: item.sku, name: item.name, available };
}

/** Sold out / back in for an extra of this store. */
export async function setAddonAvailability(id: number, storeId: number, available: boolean) {
    const addon = await queries.addonStore(id);
    if (!addon || addon.store_id !== storeId) throw new ApiError('Extra not found.', 404);
    await queries.setAddonAvailable(id, available);
    publish(storeId, 'menu.availability', { kind: 'addon', id: addon.id, available });
    return { id: addon.id, name: addon.name, available };
}
