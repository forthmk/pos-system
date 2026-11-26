// kioskApi — the self-service kiosk (backend: apps/api/src/modules/kiosk).
import { createApi } from '../axios';
import type { KioskMenu, Language, OrderSummary, PlaceKioskOrderBody } from '../model';
const { get, post } = createApi();

export const kioskApi = {
    menu: (lang: Language) => get<KioskMenu>('/kiosk/menu', { lang }),
    placeOrder: (body: PlaceKioskOrderBody) => post<OrderSummary>('/kiosk/orders', body),
    order: (id: number) => get<OrderSummary>(`/kiosk/orders/${id}`),
};
