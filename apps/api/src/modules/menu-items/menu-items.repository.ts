import { db } from '../../services/database.service';
import type { InsertableMenuItemsRow, UpdateableMenuItemsRow } from '../../types/database.types';

interface ListParams {
  page: number;
  limit: number;
  search?: string;
  category_id?: number;
  is_available?: boolean;
}

export async function findAll(params: ListParams) {
  const { page, limit, search, category_id, is_available } = params;
  const offset = (page - 1) * limit;

  let query = db.selectFrom('menu_items').selectAll();
  let countQuery = db.selectFrom('menu_items').select(db.fn.countAll<number>().as('count'));

  if (search) {
    query = query.where('name', 'like', `%${search}%`);
    countQuery = countQuery.where('name', 'like', `%${search}%`);
  }
  if (category_id !== undefined) {
    query = query.where('category_id', '=', category_id);
    countQuery = countQuery.where('category_id', '=', category_id);
  }
  if (is_available !== undefined) {
    query = query.where('is_available', '=', is_available ? 1 : 0);
    countQuery = countQuery.where('is_available', '=', is_available ? 1 : 0);
  }

  const [rows, countResult] = await Promise.all([
    query.orderBy('name', 'asc').limit(limit).offset(offset).execute(),
    countQuery.executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(countResult.count) };
}

export async function findById(id: number) {
  return db.selectFrom('menu_items').selectAll().where('menu_item_id', '=', id).executeTakeFirst();
}

export async function insert(data: InsertableMenuItemsRow) {
  const result = await db.insertInto('menu_items').values(data).executeTakeFirstOrThrow();
  return findById(Number(result.insertId));
}

export async function update(id: number, data: UpdateableMenuItemsRow) {
  await db.updateTable('menu_items').set(data).where('menu_item_id', '=', id).execute();
  return findById(id);
}

export async function remove(id: number) {
  await db.deleteFrom('menu_items').where('menu_item_id', '=', id).execute();
}
