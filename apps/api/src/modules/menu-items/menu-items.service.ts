import ApiError from '../../apiError';
import * as repository from './menu-items.repository';
import * as categoryRepository from '../categories/categories.repository';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  is_available?: boolean;
}

export async function list(params: ListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const { rows, total } = await repository.findAll({ page, limit, ...params });
  return { data: rows, total, totalPages: Math.ceil(total / limit) };
}

export async function getById(id: number) {
  const item = await repository.findById(id);
  if (!item) throw new ApiError('Menu item not found', 404);
  return item;
}

export async function create(data: {
  name: string;
  description?: string;
  price: number;
  category_id: number;
  image_url?: string;
  is_available?: boolean;
}) {
  const category = await categoryRepository.findById(data.category_id);
  if (!category) throw new ApiError('Category not found', 404, 'category_id');

  return repository.insert({
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    category_id: data.category_id,
    image_url: data.image_url ?? null,
    is_available: data.is_available !== false ? 1 : 0,
  });
}

export async function update(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    price?: number;
    category_id?: number;
    image_url?: string | null;
    is_available?: boolean;
  },
) {
  await getById(id);

  if (data.category_id !== undefined) {
    const category = await categoryRepository.findById(data.category_id);
    if (!category) throw new ApiError('Category not found', 404, 'category_id');
  }

  const patch: Record<string, any> = { ...data };
  if (data.is_available !== undefined) {
    patch.is_available = data.is_available ? 1 : 0;
  }

  return repository.update(id, patch);
}

export async function remove(id: number) {
  await getById(id);
  await repository.remove(id);
}
