import { db } from '../../services/database.service';

export const getById = (id: number) =>
    db.selectFrom('addons').select(['id', 'name', 'is_available', 'store_id']).where('id', '=', id).executeTakeFirst();

export const setAvailability = (id: number, isAvailable: boolean) =>
    db.updateTable('addons').set({ is_available: isAvailable ? 1 : 0 }).where('id', '=', id).execute();
