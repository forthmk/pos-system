import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const categoryApi = {
  list: (params?: CategoryListQuery): Promise<ApiResponse<PaginatedResponse<Category>>> =>
    api.get('/api/categories', params),

  getById: (id: number): Promise<ApiResponse<Category>> =>
    api.get(`/api/categories/${id}`),

  create: (data: CreateCategoryPayload): Promise<ApiResponse<Category>> =>
    api.post('/api/categories', data),

  update: (id: number, data: UpdateCategoryPayload): Promise<ApiResponse<Category>> =>
    api.put(`/api/categories/${id}`, data),

  remove: (id: number): Promise<ApiResponse<{ message: string }>> =>
    api.delete(`/api/categories/${id}`),
};
