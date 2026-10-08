import bcrypt from 'bcryptjs';
import ApiError from '../../apiError';
import * as repository from './auth.repository';

export async function login(username: string, password: string) {
  const user = await repository.getByUsername(username);

  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  if (user.status !== 'active') {
    throw new ApiError('Account is inactive', 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new ApiError('Invalid credentials', 401);
  }

  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

export async function getMe(userId: number) {
  const user = await repository.getById(userId);
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  return user;
}
