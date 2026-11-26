import type { Language, PlaceKioskOrderBody } from '@pos-system/shared';
import ApiError from '../../apiError';
import * as menu from '../../pipeline/menu';
import * as orders from '../../pipeline/orders';
import type { Principal } from '../../types/fastify';

// The self-service kiosk (design §5.1). Everything it shares with the cashier
// and the kitchen — the menu, pricing, numbering, saving orders — goes
// through src/pipeline/.

export const readMenu = (storeId: number, lang: Language) => menu.readMenu(storeId, lang);

const kioskTerminal = (principal: Principal) => {
    if (principal.kind !== 'device' || principal.type !== 'kiosk') {
        throw new ApiError('Only a paired kiosk screen places kiosk orders.', 403);
    }
    return principal;
};

/**
 * Proceed Order. Every kiosk order waits for payment (design decision 1 & 2:
 * with kiosk online payment off — the version 1 default — it is paid at the
 * counter by scanning its slip; with a provider, while the customer pays).
 */
export async function placeOrder(principal: Principal, body: PlaceKioskOrderBody) {
    const kiosk = kioskTerminal(principal);
    return orders.placeOrder({
        storeId: kiosk.store_id,
        terminalId: kiosk.id,
        source: 'kiosk',
        actor: 'kiosk',
        clientRef: body.client_ref,
        diningMode: body.dining_mode,
        language: body.language ?? 'en',
        paymentMethod: body.payment_method,
        lines: body.lines,
        expectedTotal: body.expected_total,
        status: 'awaiting_payment',
    });
}

/** The Order Sent screen reads its order back (only this kiosk's store). */
export const getOrder = (principal: Principal, id: number) => orders.getOrder(id, kioskTerminal(principal).store_id);
