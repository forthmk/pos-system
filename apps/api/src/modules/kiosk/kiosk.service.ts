import type { KioskMenu, Language, MenuAddon, MenuItem } from '@pos-system/shared';
import * as repository from './kiosk.repository';

// GET /kiosk/menu — the whole kiosk menu in one call (design §5.1 kiosk rules):
// only active categories / items / extras; sold-out ones stay, marked
// `available: false`; names in the kiosk language, English when missing; an
// extra's price is the item's price_override when set (§7.6); categories
// with no active items are left out.

const SETTING_KEYS = ['kiosk_idle_seconds', 'kiosk_reset_seconds', 'kiosk_online_payment'];

export async function menu(storeId: number, lang: Language): Promise<KioskMenu> {
    const [categories, items, addons, settingRows] = await Promise.all([
        repository.categories(storeId, lang),
        repository.items(storeId, lang),
        repository.itemAddons(storeId, lang),
        repository.settings(storeId, SETTING_KEYS),
    ]);

    const addonsByItem = new Map<number, MenuAddon[]>();
    for (const a of addons) {
        const list = addonsByItem.get(a.menu_item_id) ?? [];
        list.push({
            id: a.id,
            name: a.name_t ?? a.name,
            price: Number(a.price_override ?? a.price),
            available: !!a.is_available,
        });
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
        },
    };
}
