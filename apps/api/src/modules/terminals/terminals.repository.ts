import { sql } from 'kysely';
import { db } from '../../services/database.service';

export const getById = (id: number) => db.selectFrom('terminals').selectAll().where('id', '=', id).executeTakeFirst();

export const getByCode = (storeId: number, code: string) =>
    db.selectFrom('terminals').selectAll().where('store_id', '=', storeId).where('code', '=', code).executeTakeFirst();

export const getByTokenHash = (hash: string) =>
    db.selectFrom('terminals').selectAll().where('device_token_hash', '=', hash).executeTakeFirst();

export const setTokenHash = (id: number, hash: string) =>
    db.updateTable('terminals').set({ device_token_hash: hash }).where('id', '=', id).execute();

export const touchSeen = (id: number) =>
    db.updateTable('terminals').set({ last_seen_at: sql`NOW()` }).where('id', '=', id).execute();

// Never returns the token hash.
export const list = (storeId: number) =>
    db
        .selectFrom('terminals')
        .select(['id', 'code', 'type', 'name', 'kds_station_id', 'is_active', 'last_seen_at'])
        .select(sql<number>`device_token_hash IS NOT NULL`.as('paired'))
        .where('store_id', '=', storeId)
        .orderBy('code')
        .execute();
