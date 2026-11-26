import bcrypt from 'bcryptjs';
import {
    SETTINGS_SPEC,
    type AddonBody,
    type AdminMenu,
    type AdminTranslations,
    type CategoryBody,
    type CreateTerminalBody,
    type CreateUserBody,
    type DiscountTypeBody,
    type DiscountTypeRow,
    type ItemBody,
    type KdsStationRow,
    type SettingKey,
    type SettingsBody,
    type StationBody,
    type StoreSettings,
    type TerminalRow,
    type Translations,
    type UpdateTerminalBody,
    type UpdateUserBody,
    type UserRow,
    type VoucherBody,
    type VoucherRow,
} from '@pos-system/shared';
import ApiError from '../../apiError';
import { publish } from '../../pipeline/live';
import type { Principal } from '../../types/fastify';
import * as repository from './admin.repository';

/* ──────────────────────────────────────────────────────────────────────────
 * Admin setup (design §8.1 /api/admin/*). Rules:
 *   - nothing is deleted: rows are switched off (is_active), so past orders,
 *     receipts and Z-readings stay correct (order lines keep their own name
 *     and price copy anyway);
 *   - every id must belong to the admin's store;
 *   - a duplicate SKU / code / username is a plain 409 message;
 *   - menu / settings changes are announced on the live feed, so kiosks and
 *     registers show them without a reload.
 * ────────────────────────────────────────────────────────────────────────── */

const flag = (b: boolean | undefined) => (b === undefined ? undefined : b ? 1 : 0);
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const isDuplicate = (e: unknown) => (e as { code?: string })?.code === 'ER_DUP_ENTRY';
async function unique<T>(run: () => Promise<T>, message: string, field: string): Promise<T> {
    try {
        return await run();
    } catch (e) {
        if (isDuplicate(e)) throw new ApiError(message, 409, field, { code: 'DUPLICATE' });
        throw e;
    }
}
const ownedBy = <T extends { store_id: number }>(row: T | undefined, storeId: number, what: string): T => {
    if (!row || row.store_id !== storeId) throw new ApiError(`${what} not found.`, 404);
    return row;
};

/* ── menu ──────────────────────────────────────────────────────────────── */

type TRow = { lang: string; name: string; description?: string | null };
const toTranslations = (rows: TRow[]): AdminTranslations => {
    const pick = (lang: 'zh' | 'ko') => {
        const r = rows.find((x) => x.lang === lang);
        return r ? { name: r.name, description: r.description ?? null } : null;
    };
    return { zh: pick('zh'), ko: pick('ko') };
};

export async function readMenu(storeId: number): Promise<AdminMenu> {
    const [cats, adds, stations] = await Promise.all([repository.categories(storeId), repository.addons(storeId), repository.stations(storeId)]);
    const catIds = cats.map((c) => c.id);
    const its = catIds.length ? await repository.items(catIds) : [];
    const itemIds = its.map((i) => i.id);
    const addIds = adds.map((a) => a.id);
    const [catT, itemT, links, addT] = await Promise.all([
        catIds.length ? repository.categoryTranslations(catIds) : Promise.resolve([] as Awaited<ReturnType<typeof repository.categoryTranslations>>),
        itemIds.length ? repository.itemTranslations(itemIds) : Promise.resolve([] as Awaited<ReturnType<typeof repository.itemTranslations>>),
        itemIds.length ? repository.itemAddons(itemIds) : Promise.resolve([] as Awaited<ReturnType<typeof repository.itemAddons>>),
        addIds.length ? repository.addonTranslations(addIds) : Promise.resolve([] as Awaited<ReturnType<typeof repository.addonTranslations>>),
    ]);
    return {
        categories: cats.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            sort_order: c.sort_order,
            is_active: !!c.is_active,
            kds_station_id: c.kds_station_id,
            translations: toTranslations(catT.filter((t) => t.category_id === c.id)),
            items: its
                .filter((i) => i.category_id === c.id)
                .map((i) => ({
                    id: i.id,
                    category_id: i.category_id,
                    sku: i.sku,
                    name: i.name,
                    description: i.description,
                    price: Number(i.price),
                    is_bestseller: !!i.is_bestseller,
                    is_combo: !!i.is_combo,
                    is_available: !!i.is_available,
                    is_active: !!i.is_active,
                    sort_order: i.sort_order,
                    addons: links.filter((l) => l.menu_item_id === i.id).map((l) => ({ addon_id: l.addon_id, price_override: l.price_override === null ? null : Number(l.price_override) })),
                    translations: toTranslations(itemT.filter((t) => t.menu_item_id === i.id)),
                })),
        })),
        addons: adds.map((a) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price),
            is_available: !!a.is_available,
            is_active: !!a.is_active,
            translations: toTranslations(addT.filter((t) => t.addon_id === a.id)),
        })),
        stations: stations.map(toStation),
    };
}

const menuChanged = (storeId: number) => publish(storeId, 'menu.changed', {});

async function saveTranslations(
    trx: Parameters<Parameters<typeof repository.transaction>[0]>[0],
    table: 'category_translations' | 'menu_item_translations' | 'addon_translations',
    key: 'category_id' | 'menu_item_id' | 'addon_id',
    id: number,
    t: Translations | undefined,
) {
    if (!t) return;
    for (const lang of ['zh', 'ko'] as const) {
        const v = t[lang];
        if (v) await repository.setTranslation(trx, table, key, id, lang, v.name, v.description);
    }
}

const assertStation = async (storeId: number, stationId: number | null | undefined) => {
    if (stationId) ownedBy(await repository.stationById(stationId), storeId, 'Kitchen station');
};

export async function saveCategory(storeId: number, id: number | null, body: CategoryBody) {
    if (id) ownedBy(await repository.categoryById(id), storeId, 'Category');
    await assertStation(storeId, body.kds_station_id);
    const values = clean({
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        sort_order: body.sort_order,
        is_active: flag(body.is_active),
        kds_station_id: body.kds_station_id,
    });
    const savedId = await unique(
        () =>
            repository.transaction(async (trx) => {
                const cid = id ?? (await repository.insertCategory(trx, { ...values, store_id: storeId }));
                if (id) await repository.updateCategory(trx, id, values);
                await saveTranslations(trx, 'category_translations', 'category_id', cid, body.translations);
                return cid;
            }),
        `A category with code ${values.code} or name "${values.name}" already exists.`,
        'code',
    );
    menuChanged(storeId);
    return { id: savedId };
}

export async function saveItem(storeId: number, id: number | null, body: ItemBody) {
    if (id) ownedBy(await repository.itemById(id), storeId, 'Menu item');
    ownedBy(await repository.categoryById(body.category_id), storeId, 'Category');
    const links = body.addons?.map((a) => ({ addon_id: a.addon_id, price_override: a.price_override ?? null }));
    if (links) {
        const ids = [...new Set(links.map((l) => l.addon_id))];
        if (ids.length !== links.length) throw new ApiError('An extra is listed twice.', 400, 'addons');
        if ((await repository.addonsOfStore(storeId, ids)).length !== ids.length) throw new ApiError('Extra not found.', 404, 'addons');
    }
    const sku = body.sku.trim().toUpperCase();
    const values = clean({
        category_id: body.category_id,
        sku,
        name: body.name.trim(),
        description: body.description === undefined ? undefined : body.description?.trim() || null,
        price: body.price.toFixed(2),
        is_bestseller: flag(body.is_bestseller),
        is_combo: flag(body.is_combo),
        is_active: flag(body.is_active),
        sort_order: body.sort_order,
    });
    const savedId = await unique(
        () =>
            repository.transaction(async (trx) => {
                const iid = id ?? (await repository.insertItem(trx, values));
                if (id) await repository.updateItem(trx, id, values);
                if (links) await repository.replaceItemAddons(trx, iid, links);
                await saveTranslations(trx, 'menu_item_translations', 'menu_item_id', iid, body.translations);
                return iid;
            }),
        `SKU ${sku} is already used by another item.`,
        'sku',
    );
    menuChanged(storeId);
    return { id: savedId };
}

export async function saveAddon(storeId: number, id: number | null, body: AddonBody) {
    if (id) ownedBy(await repository.addonById(id), storeId, 'Extra');
    const values = clean({ name: body.name.trim(), price: body.price.toFixed(2), is_active: flag(body.is_active) });
    const savedId = await unique(
        () =>
            repository.transaction(async (trx) => {
                const aid = id ?? (await repository.insertAddon(trx, { ...values, store_id: storeId }));
                if (id) await repository.updateAddon(trx, id, values);
                await saveTranslations(trx, 'addon_translations', 'addon_id', aid, body.translations);
                return aid;
            }),
        `An extra named "${values.name}" already exists.`,
        'name',
    );
    menuChanged(storeId);
    return { id: savedId };
}

/* ── kitchen stations, terminals ───────────────────────────────────────── */

const toStation = (s: { id: number; code: string; name: string; is_active: number }): KdsStationRow => ({ id: s.id, code: s.code, name: s.name, is_active: !!s.is_active });

export const listStations = async (storeId: number) => (await repository.stations(storeId)).map(toStation);

export async function saveStation(storeId: number, id: number | null, body: StationBody) {
    if (id) ownedBy(await repository.stationById(id), storeId, 'Kitchen station');
    const values = clean({ code: body.code.trim().toUpperCase(), name: body.name.trim(), is_active: flag(body.is_active) });
    const savedId = await unique(
        async () => {
            if (id) {
                await repository.updateStation(id, values);
                return id;
            }
            return repository.insertStation({ ...values, store_id: storeId });
        },
        `Station code ${values.code} is already used.`,
        'code',
    );
    return { id: savedId };
}

export async function listTerminals(storeId: number): Promise<TerminalRow[]> {
    return (await repository.terminals(storeId)).map((t) => ({
        id: t.id,
        code: t.code,
        type: t.type,
        name: t.name,
        kds_station_id: t.kds_station_id,
        is_active: !!t.is_active,
        paired: !!Number(t.paired),
        last_seen_at: iso(t.last_seen_at),
    }));
}

export async function createTerminal(storeId: number, body: CreateTerminalBody) {
    if (body.kds_station_id && body.type !== 'kds') throw new ApiError('Only a kitchen screen has a station.', 400, 'kds_station_id');
    await assertStation(storeId, body.kds_station_id);
    const code = body.code.trim().toUpperCase();
    const id = await unique(
        () => repository.insertTerminal({ store_id: storeId, code, type: body.type, name: body.name.trim(), kds_station_id: body.kds_station_id ?? null }),
        `Terminal code ${code} is already used.`,
        'code',
    );
    return { id };
}

export async function updateTerminal(storeId: number, id: number, body: UpdateTerminalBody) {
    const t = ownedBy(await repository.terminalById(id), storeId, 'Terminal');
    if (body.kds_station_id && t.type !== 'kds') throw new ApiError('Only a kitchen screen has a station.', 400, 'kds_station_id');
    await assertStation(storeId, body.kds_station_id);
    await repository.updateTerminal(id, clean({ name: body.name?.trim(), kds_station_id: body.kds_station_id, is_active: flag(body.is_active) }));
    return { id };
}

/** A lost or replaced tablet: its device token stops working at once; pair the new one with POST /auth/terminals/:id/pair. */
export async function unpairTerminal(storeId: number, id: number) {
    const t = ownedBy(await repository.terminalById(id), storeId, 'Terminal');
    if (t.type === 'pos') throw new ApiError('Cashier registers are not paired — staff sign in there with their PIN.', 400);
    await repository.unpairTerminal(id);
    return { id, paired: false };
}

/* ── discounts, vouchers ───────────────────────────────────────────────── */

export async function listDiscountTypes(storeId: number): Promise<DiscountTypeRow[]> {
    return (await repository.discountTypes(storeId)).map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        kind: d.kind,
        rate: Number(d.rate),
        requires_id: !!d.requires_id,
        sort_order: d.sort_order,
        is_active: !!d.is_active,
        rate_editable: d.kind === 'percent',
    }));
}

export async function updateDiscountType(storeId: number, id: number, body: DiscountTypeBody) {
    const d = ownedBy(await repository.discountTypeById(id), storeId, 'Discount');
    if (body.rate !== undefined && d.kind !== 'percent') {
        throw new ApiError(d.kind === 'senior_pwd' ? 'The Senior / PWD 20% is set by law and can’t be changed.' : 'This discount has no rate to change.', 400, 'rate');
    }
    await repository.updateDiscountType(id, clean({ name: body.name?.trim(), rate: body.rate?.toFixed(4), sort_order: body.sort_order, is_active: flag(body.is_active) }));
    return { id };
}

const toVoucher = (v: Awaited<ReturnType<typeof repository.vouchers>>[number]): VoucherRow => ({
    id: v.id,
    code: v.code,
    kind: v.kind,
    value: Number(v.value),
    min_spend: Number(v.min_spend),
    valid_from: iso(v.valid_from),
    valid_to: iso(v.valid_to),
    max_uses: v.max_uses,
    used_count: v.used_count,
    is_active: !!v.is_active,
});

export const listVouchers = async (storeId: number) => (await repository.vouchers(storeId)).map(toVoucher);

export async function saveVoucher(storeId: number, id: number | null, body: VoucherBody) {
    if (id) ownedBy(await repository.voucherById(id), storeId, 'Voucher');
    if (body.kind === 'percent' && body.value > 100) throw new ApiError('A percent voucher is 1–100%.', 400, 'value');
    if (body.valid_from && body.valid_to && new Date(body.valid_to) <= new Date(body.valid_from)) {
        throw new ApiError('"Valid to" must be after "valid from".', 400, 'valid_to');
    }
    const code = body.code.trim().toUpperCase();
    const values = clean({
        code,
        kind: body.kind,
        value: body.value.toFixed(2),
        min_spend: (body.min_spend ?? 0).toFixed(2),
        valid_from: body.valid_from === undefined ? undefined : body.valid_from ? new Date(body.valid_from) : null,
        valid_to: body.valid_to === undefined ? undefined : body.valid_to ? new Date(body.valid_to) : null,
        max_uses: body.max_uses,
        is_active: flag(body.is_active),
    });
    const savedId = await unique(
        async () => {
            if (id) {
                await repository.updateVoucher(id, values);
                return id;
            }
            return repository.insertVoucher({ ...values, store_id: storeId });
        },
        `Voucher ${code} already exists.`,
        'code',
    );
    return { id: savedId };
}

/* ── staff ─────────────────────────────────────────────────────────────── */

export async function listUsers(storeId: number): Promise<UserRow[]> {
    return (await repository.users(storeId)).map((u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, is_active: !!u.is_active, last_login_at: iso(u.last_login_at) }));
}

export async function createUser(storeId: number, body: CreateUserBody) {
    const username = body.username.trim().toLowerCase();
    const id = await unique(
        async () => repository.insertUser({ store_id: storeId, username, name: body.name.trim(), role: body.role, pin_hash: await bcrypt.hash(body.pin, 10) }),
        `Username ${username} is already taken.`,
        'username',
    );
    return { id };
}

/**
 * Change a user's name, role, PIN or switch them off. The store always keeps
 * one active admin, and an admin can't switch themselves off (they would be
 * locked out at once — resolvePrincipal re-reads the user on every request).
 */
export async function updateUser(principal: Principal, id: number, body: UpdateUserBody) {
    const storeId = principal.store_id;
    const u = ownedBy(await repository.userById(id), storeId, 'User');
    if (principal.kind === 'staff' && principal.id === id && body.is_active === false) {
        throw new ApiError('You can’t switch off your own account.', 409, 'is_active', { code: 'SELF' });
    }
    const losesAdmin = u.role === 'admin' && !!u.is_active && (body.is_active === false || (body.role !== undefined && body.role !== 'admin'));
    if (losesAdmin && (await repository.activeAdmins(storeId)) <= 1) {
        throw new ApiError('Keep at least one active admin.', 409, 'role', { code: 'LAST_ADMIN' });
    }
    await repository.updateUser(
        id,
        clean({ name: body.name?.trim(), role: body.role, is_active: flag(body.is_active), pin_hash: body.pin ? await bcrypt.hash(body.pin, 10) : undefined }),
    );
    return { id };
}

/* ── settings ──────────────────────────────────────────────────────────── */

export async function readSettings(storeId: number): Promise<StoreSettings> {
    const [store, rows] = await Promise.all([repository.store(storeId), repository.settings(storeId)]);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
        store,
        values: Object.fromEntries(SETTINGS_SPEC.map((s) => [s.key, Number(map.get(s.key) ?? s.min)])) as Record<SettingKey, number>,
        fixed: {
            vat_rate: Number(map.get('vat_rate') ?? 0.12),
            senior_pwd_rate: Number(map.get('senior_pwd_rate') ?? 0.2),
            kiosk_online_payment: map.get('kiosk_online_payment') ?? 'off',
        },
    };
}

export async function saveSettings(storeId: number, body: SettingsBody) {
    const values = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    if (Object.keys(values).length) {
        await repository.saveSettings(storeId, values);
        publish(storeId, 'settings.changed', { keys: Object.keys(values) });
    }
    return readSettings(storeId);
}
