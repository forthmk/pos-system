import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  MenuItem,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  MenuItemListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const menuItemApi = {
  list: (params?: MenuItemListQuery): Promise<ApiResponse<PaginatedResponse<MenuItem>>> =>
    api.get('/api/menu-items', params),

  getById: (id: number): Promise<ApiResponse<MenuItem>> =>
    api.get(`/api/menu-items/${id}`),

  create: (data: CreateMenuItemPayload): Promise<ApiResponse<MenuItem>> =>
    api.post('/api/menu-items', data),

  update: (id: number, data: UpdateMenuItemPayload): Promise<ApiResponse<MenuItem>> =>
    api.put(`/api/menu-items/${id}`, data),

  remove: (id: number): Promise<ApiResponse<{ message: string }>> =>
    api.delete(`/api/menu-items/${id}`),
};
