import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const userApi = {
  list: (params?: UserListQuery): Promise<ApiResponse<PaginatedResponse<User>>> =>
    api.get('/api/users', params),

  getById: (id: number): Promise<ApiResponse<User>> =>
    api.get(`/api/users/${id}`),

  create: (data: CreateUserPayload): Promise<ApiResponse<User>> =>
    api.post('/api/users', data),

  update: (id: number, data: UpdateUserPayload): Promise<ApiResponse<User>> =>
    api.put(`/api/users/${id}`, data),

  remove: (id: number): Promise<ApiResponse<{ message: string }>> =>
    api.delete(`/api/users/${id}`),
};
