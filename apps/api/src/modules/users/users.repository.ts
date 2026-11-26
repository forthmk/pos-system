import { sql } from 'kysely';
import { db } from '../../services/database.service';

export const getById = (id: number) => db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();

export const getByUsername = (username: string) =>
    db.selectFrom('users').selectAll().where('username', '=', username).executeTakeFirst();

export const touchLogin = (id: number) =>
    db.updateTable('users').set({ last_login_at: sql`NOW()` }).where('id', '=', id).execute();
