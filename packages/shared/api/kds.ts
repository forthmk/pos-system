// kdsApi — the kitchen display (backend: apps/api/src/modules/kds) and the
// Orders board (modules/kiosk).
import { createApi } from '../axios';
import type { KdsTickets, OrdersBoard } from '../model';
const { get, post } = createApi();

export const kdsApi = {
    tickets: (station?: number) => get<KdsTickets>('/kds/tickets', station ? { station } : undefined),
    complete: (orderId: number) => post<{ order_id: number }>(`/kds/orders/${orderId}/complete`),
    recall: (orderId: number) => post<{ order_id: number }>(`/kds/orders/${orderId}/recall`),
    clearServed: () => post<{ cleared: number }>('/kds/clear-served'),
    board: () => get<OrdersBoard>('/kiosk/board'),
};
