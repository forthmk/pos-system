import type { Language } from '@pos-system/shared';
import { db } from '../../services/database.service';

// Active categories / items / extras of a store, each with its name in
// `lang` (null when there is no translation — the service falls back to
// English). Sold-out rows are included; the kiosk greys them out.

export const categories = (storeId: number, lang: Language) =>
    db
        .selectFrom('categories as c')
        .leftJoin('category_translations as t', (j) => j.onRef('t.category_id', '=', 'c.id').on('t.lang', '=', lang))
        .select(['c.id', 'c.code', 'c.name', 't.name as name_t'])
        .where('c.store_id', '=', storeId)
        .where('c.is_active', '=', 1)
        .orderBy('c.sort_order')
        .orderBy('c.id')
        .execute();

export const items = (storeId: number, lang: Language) =>
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
        .execute();

export const itemAddons = (storeId: number, lang: Language) =>
    db
        .selectFrom('menu_item_addons as mia')
        .innerJoin('addons as a', 'a.id', 'mia.addon_id')
        .leftJoin('addon_translations as t', (j) => j.onRef('t.addon_id', '=', 'a.id').on('t.lang', '=', lang))
        .select(['mia.menu_item_id', 'a.id', 'a.name', 'a.price', 'mia.price_override', 'a.is_available', 't.name as name_t'])
        .where('a.store_id', '=', storeId)
        .where('a.is_active', '=', 1)
        .orderBy('mia.sort_order')
        .orderBy('a.id')
        .execute();

export const settings = (storeId: number, keys: string[]) =>
    db.selectFrom('settings').select(['key', 'value']).where('store_id', '=', storeId).where('key', 'in', keys).execute();
