import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  Payment,
  CreatePaymentPayload,
  PaymentListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const paymentApi = {
  list: (params?: PaymentListQuery): Promise<ApiResponse<PaginatedResponse<Payment>>> =>
    api.get('/api/payments', params),

  getById: (id: number): Promise<ApiResponse<Payment>> =>
    api.get(`/api/payments/${id}`),

  getByOrder: (orderId: number): Promise<ApiResponse<Payment[]>> =>
    api.get(`/api/payments`, { order_id: orderId }),

  create: (data: CreatePaymentPayload): Promise<ApiResponse<Payment>> =>
    api.post('/api/payments', data),
};
