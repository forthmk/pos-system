import { db } from '../../services/database.service';
import type { InsertableCategoriesRow, UpdateableCategoriesRow } from '../../types/database.types';

export async function findAll(params: { page: number; limit: number; search?: string }) {
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  let query = db.selectFrom('categories').selectAll();
  let countQuery = db.selectFrom('categories').select(db.fn.countAll<number>().as('count'));

  if (search) {
    query = query.where('name', 'like', `%${search}%`);
    countQuery = countQuery.where('name', 'like', `%${search}%`);
  }

  const [rows, countResult] = await Promise.all([
    query.orderBy('name', 'asc').limit(limit).offset(offset).execute(),
    countQuery.executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(countResult.count) };
}

export async function findById(id: number) {
  return db.selectFrom('categories').selectAll().where('category_id', '=', id).executeTakeFirst();
}

export async function findByName(name: string) {
  return db.selectFrom('categories').selectAll().where('name', '=', name).executeTakeFirst();
}

export async function insert(data: InsertableCategoriesRow) {
  const result = await db.insertInto('categories').values(data).executeTakeFirstOrThrow();
  return findById(Number(result.insertId));
}

export async function update(id: number, data: UpdateableCategoriesRow) {
  await db.updateTable('categories').set(data).where('category_id', '=', id).execute();
  return findById(id);
}

export async function remove(id: number) {
  await db.deleteFrom('categories').where('category_id', '=', id).execute();
}
