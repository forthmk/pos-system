import type { Language } from '@pos-system/shared';
import * as menu from '../../pipeline/menu';

// The self-service kiosk (design §5.1). Everything it shares with the cashier
// and the kitchen — reading the menu, and soon pricing and saving orders —
// goes through src/pipeline/.

export const readMenu = (storeId: number, lang: Language) => menu.readMenu(storeId, lang);
