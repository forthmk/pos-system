import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  Order,
  OrderWithItems,
  CreateOrderPayload,
  UpdateOrderStatusPayload,
  OrderListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const orderApi = {
  list: (params?: OrderListQuery): Promise<ApiResponse<PaginatedResponse<Order>>> =>
    api.get('/api/orders', params),

  getById: (id: number): Promise<ApiResponse<OrderWithItems>> =>
    api.get(`/api/orders/${id}`),

  create: (data: CreateOrderPayload): Promise<ApiResponse<OrderWithItems>> =>
    api.post('/api/orders', data),

  updateStatus: (id: number, data: UpdateOrderStatusPayload): Promise<ApiResponse<Order>> =>
    api.patch(`/api/orders/${id}/status`, data),

  cancel: (id: number): Promise<ApiResponse<Order>> =>
    api.patch(`/api/orders/${id}/status`, { status: 'cancelled' }),
};
