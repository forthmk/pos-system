import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  RestaurantTable,
  CreateTablePayload,
  UpdateTablePayload,
  TableListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const tableApi = {
  list: (params?: TableListQuery): Promise<ApiResponse<PaginatedResponse<RestaurantTable>>> =>
    api.get('/api/tables', params),

  getById: (id: number): Promise<ApiResponse<RestaurantTable>> =>
    api.get(`/api/tables/${id}`),

  create: (data: CreateTablePayload): Promise<ApiResponse<RestaurantTable>> =>
    api.post('/api/tables', data),

  update: (id: number, data: UpdateTablePayload): Promise<ApiResponse<RestaurantTable>> =>
    api.put(`/api/tables/${id}`, data),

  remove: (id: number): Promise<ApiResponse<{ message: string }>> =>
    api.delete(`/api/tables/${id}`),
};
