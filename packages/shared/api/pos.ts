// posApi — the cashier register (backend: apps/api/src/modules/pos).
import { createApi } from '../axios';
import type { KioskMenu, ScanResult } from '../model';
const { get, patch, post } = createApi();

export const posApi = {
    menu: () => get<KioskMenu>('/pos/menu'),
    setItemAvailability: (id: number, is_available: boolean) => patch(`/pos/menu-items/${id}/availability`, { is_available }),
    setAddonAvailability: (id: number, is_available: boolean) => patch(`/pos/addons/${id}/availability`, { is_available }),
    scan: (code: string) => get<ScanResult>(`/pos/scan/${encodeURIComponent(code)}`),
    release: (orderId: number) => post<{ released: boolean }>(`/pos/orders/${orderId}/release`),
};
