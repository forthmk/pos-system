import { sql, type Transaction } from 'kysely';
import type { DB } from '../../config/database/types.gen';
import { db } from '../../services/database.service';

// Queries only the admin setup uses. The menu the screens read comes from
// src/pipeline/menu.ts; this is the editing side.

type Trx = Transaction<DB>;
export const transaction = <T>(fn: (trx: Trx) => Promise<T>) => db.transaction().execute(fn);
const insertId = (r: { insertId?: bigint }) => Number(r.insertId);
const changed = (r: { numUpdatedRows: bigint }) => Number(r.numUpdatedRows);

/* ── menu ──────────────────────────────────────────────────────────────── */

export const categories = (storeId: number) =>
    db.selectFrom('categories').selectAll().where('store_id', '=', storeId).orderBy('sort_order').orderBy('id').execute();
export const categoryTranslations = (ids: number[]) =>
    db.selectFrom('category_translations').select(['category_id', 'lang', 'name']).where('category_id', 'in', ids).execute();
export const items = (categoryIds: number[]) =>
    db.selectFrom('menu_items').selectAll().where('category_id', 'in', categoryIds).orderBy('sort_order').orderBy('id').execute();
export const itemTranslations = (ids: number[]) =>
    db.selectFrom('menu_item_translations').select(['menu_item_id', 'lang', 'name', 'description']).where('menu_item_id', 'in', ids).execute();
export const itemAddons = (ids: number[]) =>
    db.selectFrom('menu_item_addons').select(['menu_item_id', 'addon_id', 'price_override', 'sort_order']).where('menu_item_id', 'in', ids).orderBy('sort_order').execute();
export const addons = (storeId: number) => db.selectFrom('addons').selectAll().where('store_id', '=', storeId).orderBy('id').execute();
export const addonTranslations = (ids: number[]) =>
    db.selectFrom('addon_translations').select(['addon_id', 'lang', 'name']).where('addon_id', 'in', ids).execute();

export const categoryById = (id: number) => db.selectFrom('categories').select(['id', 'store_id']).where('id', '=', id).executeTakeFirst();
export const itemById = (id: number) =>
    db
        .selectFrom('menu_items as m')
        .innerJoin('categories as c', 'c.id', 'm.category_id')
        .select(['m.id', 'c.store_id'])
        .where('m.id', '=', id)
        .executeTakeFirst();
export const addonById = (id: number) => db.selectFrom('addons').select(['id', 'store_id']).where('id', '=', id).executeTakeFirst();
export const addonsOfStore = (storeId: number, ids: number[]) =>
    ids.length ? db.selectFrom('addons').select('id').where('store_id', '=', storeId).where('id', 'in', ids).execute() : Promise.resolve([]);

export const insertCategory = async (trx: Trx, v: Record<string, unknown>) => insertId(await trx.insertInto('categories').values(v as never).executeTakeFirstOrThrow());
export const updateCategory = (trx: Trx, id: number, v: Record<string, unknown>) => trx.updateTable('categories').set(v as never).where('id', '=', id).execute();
export const insertItem = async (trx: Trx, v: Record<string, unknown>) => insertId(await trx.insertInto('menu_items').values(v as never).executeTakeFirstOrThrow());
export const updateItem = (trx: Trx, id: number, v: Record<string, unknown>) => trx.updateTable('menu_items').set(v as never).where('id', '=', id).execute();
export const insertAddon = async (trx: Trx, v: Record<string, unknown>) => insertId(await trx.insertInto('addons').values(v as never).executeTakeFirstOrThrow());
export const updateAddon = (trx: Trx, id: number, v: Record<string, unknown>) => trx.updateTable('addons').set(v as never).where('id', '=', id).execute();

/** The extras offered with an item: replaced as a whole, in the given order. */
export async function replaceItemAddons(trx: Trx, itemId: number, links: { addon_id: number; price_override: number | null }[]) {
    await trx.deleteFrom('menu_item_addons').where('menu_item_id', '=', itemId).execute();
    if (links.length) {
        await trx
            .insertInto('menu_item_addons')
            .values(links.map((l, i) => ({ menu_item_id: itemId, addon_id: l.addon_id, price_override: l.price_override === null ? null : l.price_override.toFixed(2), sort_order: i })))
            .execute();
    }
}

type TTable = 'category_translations' | 'menu_item_translations' | 'addon_translations';
type TKey = 'category_id' | 'menu_item_id' | 'addon_id';
/** Upsert a translation; an empty name removes it (English is shown instead). */
export async function setTranslation(trx: Trx, table: TTable, key: TKey, id: number, lang: 'zh' | 'ko', name: string, description?: string | null) {
    if (!name.trim()) {
        await sql`DELETE FROM ${sql.table(table)} WHERE ${sql.ref(key)} = ${id} AND lang = ${lang}`.execute(trx);
        return;
    }
    const row: Record<string, unknown> = { [key]: id, lang, name: name.trim() };
    if (table === 'menu_item_translations') row.description = description?.trim() || null;
    const update: Record<string, unknown> = { name: name.trim() };
    if (table === 'menu_item_translations') update.description = row.description;
    await trx.insertInto(table).values(row as never).onDuplicateKeyUpdate(update as never).execute();
}

/* ── kitchen stations, terminals ───────────────────────────────────────── */

export const stations = (storeId: number) => db.selectFrom('kds_stations').selectAll().where('store_id', '=', storeId).orderBy('code').execute();
export const stationById = (id: number) => db.selectFrom('kds_stations').select(['id', 'store_id']).where('id', '=', id).executeTakeFirst();
export const insertStation = async (v: Record<string, unknown>) => insertId(await db.insertInto('kds_stations').values(v as never).executeTakeFirstOrThrow());
export const updateStation = (id: number, v: Record<string, unknown>) => db.updateTable('kds_stations').set(v as never).where('id', '=', id).execute();

export const terminals = (storeId: number) =>
    db
        .selectFrom('terminals')
        .select(['id', 'code', 'type', 'name', 'kds_station_id', 'is_active', 'last_seen_at'])
        .select(sql<number>`device_token_hash IS NOT NULL`.as('paired'))
        .where('store_id', '=', storeId)
        .orderBy('type')
        .orderBy('code')
        .execute();
export const terminalById = (id: number) => db.selectFrom('terminals').select(['id', 'store_id', 'type', 'code']).where('id', '=', id).executeTakeFirst();
export const insertTerminal = async (v: Record<string, unknown>) => insertId(await db.insertInto('terminals').values(v as never).executeTakeFirstOrThrow());
export const updateTerminal = (id: number, v: Record<string, unknown>) => db.updateTable('terminals').set(v as never).where('id', '=', id).execute();
/** Unpair: the screen's device token stops working at once (resolvePrincipal). */
export const unpairTerminal = (id: number) => db.updateTable('terminals').set({ device_token_hash: null }).where('id', '=', id).execute();

/* ── discounts, vouchers ───────────────────────────────────────────────── */

export const discountTypes = (storeId: number) => db.selectFrom('discount_types').selectAll().where('store_id', '=', storeId).orderBy('sort_order').orderBy('id').execute();
export const discountTypeById = (id: number) => db.selectFrom('discount_types').select(['id', 'store_id', 'kind', 'code']).where('id', '=', id).executeTakeFirst();
export const updateDiscountType = (id: number, v: Record<string, unknown>) => db.updateTable('discount_types').set(v as never).where('id', '=', id).execute();

export const vouchers = (storeId: number) => db.selectFrom('vouchers').selectAll().where('store_id', '=', storeId).orderBy('is_active', 'desc').orderBy('id', 'desc').execute();
export const voucherById = (id: number) => db.selectFrom('vouchers').select(['id', 'store_id']).where('id', '=', id).executeTakeFirst();
export const insertVoucher = async (v: Record<string, unknown>) => insertId(await db.insertInto('vouchers').values(v as never).executeTakeFirstOrThrow());
export const updateVoucher = (id: number, v: Record<string, unknown>) => db.updateTable('vouchers').set(v as never).where('id', '=', id).execute();

/* ── staff ─────────────────────────────────────────────────────────────── */

export const users = (storeId: number) =>
    db.selectFrom('users').select(['id', 'username', 'name', 'role', 'is_active', 'last_login_at']).where('store_id', '=', storeId).orderBy('is_active', 'desc').orderBy('name').execute();
export const userById = (id: number) => db.selectFrom('users').select(['id', 'store_id', 'role', 'is_active']).where('id', '=', id).executeTakeFirst();
export const activeAdmins = async (storeId: number) =>
    Number((await db.selectFrom('users').select(sql<number>`COUNT(*)`.as('n')).where('store_id', '=', storeId).where('role', '=', 'admin').where('is_active', '=', 1).executeTakeFirstOrThrow()).n);
export const insertUser = async (v: Record<string, unknown>) => insertId(await db.insertInto('users').values(v as never).executeTakeFirstOrThrow());
export const updateUser = async (id: number, v: Record<string, unknown>) => changed(await db.updateTable('users').set(v as never).where('id', '=', id).executeTakeFirst());

/* ── settings ──────────────────────────────────────────────────────────── */

export const store = (storeId: number) => db.selectFrom('stores').select(['code', 'name']).where('id', '=', storeId).executeTakeFirstOrThrow();
export const settings = (storeId: number) => db.selectFrom('settings').select(['key', 'value']).where('store_id', '=', storeId).execute();
export const saveSettings = (storeId: number, values: Record<string, string>) =>
    db
        .insertInto('settings')
        .values(Object.entries(values).map(([key, value]) => ({ store_id: storeId, key, value })))
        .onDuplicateKeyUpdate({ value: sql`VALUES(value)` })
        .execute();
