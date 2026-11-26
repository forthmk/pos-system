// posApi — the cashier register (backend: apps/api/src/modules/pos).
import { createApi } from '../axios';
import type { KioskMenu } from '../model';
const { get, patch } = createApi();

export const posApi = {
    menu: () => get<KioskMenu>('/pos/menu'),
    setItemAvailability: (id: number, is_available: boolean) => patch(`/pos/menu-items/${id}/availability`, { is_available }),
    setAddonAvailability: (id: number, is_available: boolean) => patch(`/pos/addons/${id}/availability`, { is_available }),
};
