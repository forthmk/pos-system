import ApiError from '../../apiError';
import * as repository from './categories.repository';

export async function list(params: { page?: number; limit?: number; search?: string }) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const { rows, total } = await repository.findAll({ page, limit, search: params.search });
  return { data: rows, total, totalPages: Math.ceil(total / limit) };
}

export async function getById(id: number) {
  const category = await repository.findById(id);
  if (!category) throw new ApiError('Category not found', 404);
  return category;
}

export async function create(data: { name: string; description?: string }) {
  const existing = await repository.findByName(data.name);
  if (existing) throw new ApiError('Category name already exists', 409, 'name');
  return repository.insert({ name: data.name, description: data.description ?? null });
}

export async function update(id: number, data: { name?: string; description?: string | null }) {
  await getById(id);
  if (data.name) {
    const existing = await repository.findByName(data.name);
    if (existing && existing.category_id !== id) {
      throw new ApiError('Category name already exists', 409, 'name');
    }
  }
  return repository.update(id, data);
}

export async function remove(id: number) {
  await getById(id);
  await repository.remove(id);
}
