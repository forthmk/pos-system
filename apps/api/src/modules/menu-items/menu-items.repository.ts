import { db } from '../../services/database.service';

export const getWithStore = (id: number) =>
    db
        .selectFrom('menu_items as m')
        .innerJoin('categories as c', 'c.id', 'm.category_id')
        .select(['m.id', 'm.sku', 'm.name', 'm.is_available', 'c.store_id'])
        .where('m.id', '=', id)
        .executeTakeFirst();

export const setAvailability = (id: number, isAvailable: boolean) =>
    db.updateTable('menu_items').set({ is_available: isAvailable ? 1 : 0 }).where('id', '=', id).execute();
