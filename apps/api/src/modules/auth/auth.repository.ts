import { db } from '../../services/database.service';

export async function getByUsername(username: string) {
  return db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', username)
    .executeTakeFirst();
}

export async function getById(userId: number) {
  return db
    .selectFrom('users')
    .select(['user_id', 'name', 'username', 'role', 'status', 'created_at'])
    .where('user_id', '=', userId)
    .executeTakeFirst();
}
