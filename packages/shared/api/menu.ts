// Import and use:
//   import { kioskApi, menuItemApi, addonApi } from '@shared/api';
//   kioskApi.menu('zh')                          // the kiosk menu in one call
//   menuItemApi.setAvailability(4, false)        // sold out
//   addonApi.setAvailability(2, true)            // extra back in

import { createApi } from '../axios';
import type { KioskMenu, Language } from '../model';
const { get, patch } = createApi();

export const kioskApi = {
    menu: (lang: Language) => get<KioskMenu>('/kiosk/menu', { lang }),
};

export const menuItemApi = {
    setAvailability: (id: number, is_available: boolean) => patch(`/menu-items/${id}/availability`, { is_available }),
};

export const addonApi = {
    setAvailability: (id: number, is_available: boolean) => patch(`/addons/${id}/availability`, { is_available }),
};
