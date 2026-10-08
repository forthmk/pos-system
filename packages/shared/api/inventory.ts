import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';
import type {
  Inventory,
  UpdateInventoryPayload,
  AdjustStockPayload,
  InventoryListQuery,
  PaginatedResponse,
} from '../model';

const api = createApi();

export const inventoryApi = {
  list: (params?: InventoryListQuery): Promise<ApiResponse<PaginatedResponse<Inventory>>> =>
    api.get('/api/inventory', params),

  getByMenuItem: (menuItemId: number): Promise<ApiResponse<Inventory>> =>
    api.get(`/api/inventory/${menuItemId}`),

  update: (menuItemId: number, data: UpdateInventoryPayload): Promise<ApiResponse<Inventory>> =>
    api.put(`/api/inventory/${menuItemId}`, data),

  adjustStock: (menuItemId: number, data: AdjustStockPayload): Promise<ApiResponse<Inventory>> =>
    api.patch(`/api/inventory/${menuItemId}/adjust`, data),
};
