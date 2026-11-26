import ApiError from '../../apiError';
import * as repository from './addons.repository';

// Sold out / back in for an extra (design decision 19): the kiosk greys it in
// "Add extras / sides" and the order API refuses it.
export async function setAvailability(id: number, storeId: number, isAvailable: boolean) {
    const addon = await repository.getById(id);
    if (!addon || addon.store_id !== storeId) throw new ApiError('Extra not found.', 404);
    await repository.setAvailability(id, isAvailable);
    return { id: addon.id, name: addon.name, available: isAvailable };
}
