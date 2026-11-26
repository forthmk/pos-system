import { sql } from 'kysely';
import { db } from '../../services/database.service';

/* ── staff ─────────────────────────────────────────────────────────────── */

export const getUserById = (id: number) => db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();

export const getUserByUsername = (username: string) =>
    db.selectFrom('users').selectAll().where('username', '=', username).executeTakeFirst();

export const touchLogin = (id: number) =>
    db.updateTable('users').set({ last_login_at: sql`NOW()` }).where('id', '=', id).execute();

/* ── terminals (registers, kiosks, kitchen screens) ──────────────────────── */

export const getTerminalById = (id: number) => db.selectFrom('terminals').selectAll().where('id', '=', id).executeTakeFirst();

export const getTerminalByCode = (storeId: number, code: string) =>
    db.selectFrom('terminals').selectAll().where('store_id', '=', storeId).where('code', '=', code).executeTakeFirst();

export const getTerminalByTokenHash = (hash: string) =>
    db.selectFrom('terminals').selectAll().where('device_token_hash', '=', hash).executeTakeFirst();

export const setTerminalTokenHash = (id: number, hash: string) =>
    db.updateTable('terminals').set({ device_token_hash: hash }).where('id', '=', id).execute();

export const touchTerminalSeen = (id: number) =>
    db.updateTable('terminals').set({ last_seen_at: sql`NOW()` }).where('id', '=', id).execute();

// Never returns the token hash.
export const listTerminals = (storeId: number) =>
    db
        .selectFrom('terminals')
        .select(['id', 'code', 'type', 'name', 'kds_station_id', 'is_active', 'last_seen_at'])
        .select(sql<number>`device_token_hash IS NOT NULL`.as('paired'))
        .where('store_id', '=', storeId)
        .orderBy('code')
        .execute();
