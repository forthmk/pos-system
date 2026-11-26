// kioskApi — the self-service kiosk (backend: apps/api/src/modules/kiosk).
import { createApi } from '../axios';
import type { KioskMenu, Language } from '../model';
const { get } = createApi();

export const kioskApi = {
    menu: (lang: Language) => get<KioskMenu>('/kiosk/menu', { lang }),
};
