import * as menu from '../../pipeline/menu';

// The cashier register (design §5.3–5.4, §5.10). Shared work — the menu, and
// soon pricing, numbering and saving orders — goes through src/pipeline/.

/** The register's menu: English names (receipts, kitchen), SKU codes. */
export const readMenu = (storeId: number) => menu.readMenu(storeId, 'en');

/** Sold out / back in (design decision 19). */
export const setItemAvailability = menu.setItemAvailability;
export const setAddonAvailability = menu.setAddonAvailability;
