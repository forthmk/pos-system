import ApiError from '../../apiError';
import * as repository from './menu-items.repository';

// Sold out / back in for a menu item (design decision 19). The kiosk greys a
// sold-out item and the order API refuses it.
export async function setAvailability(id: number, storeId: number, isAvailable: boolean) {
    const item = await repository.getWithStore(id);
    if (!item || item.store_id !== storeId) throw new ApiError('Menu item not found.', 404);
    await repository.setAvailability(id, isAvailable);
    return { id: item.id, sku: item.sku, name: item.name, available: isAvailable };
}
