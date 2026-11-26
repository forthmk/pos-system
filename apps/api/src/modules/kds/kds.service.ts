import type { KdsTickets } from '@pos-system/shared';
import ApiError from '../../apiError';
import * as kitchen from '../../pipeline/kitchen';
import { publish } from '../../pipeline/live';
import type { Actor } from '../../pipeline/status';
import type { Principal } from '../../types/fastify';

/* ──────────────────────────────────────────────────────────────────────────
 * The kitchen display (design §5.5–5.6). Used by a paired KDS screen (its
 * own station) or a chef / manager signed in on any screen (?station= or
 * every station). The work itself — tickets, complete, recall, clear — is
 * src/pipeline/kitchen.ts; this file says who is acting and tells the other
 * screens (pipeline/live).
 * ────────────────────────────────────────────────────────────────────────── */

/** Who bumped it, for order_status_events. */
const actorOf = (p: Principal): { actor: Actor; userId: number | null; terminalId: number | null } =>
    p.kind === 'device'
        ? { actor: 'chef', userId: null, terminalId: p.id }
        : { actor: p.role === 'chef' ? 'chef' : 'manager', userId: p.id, terminalId: p.terminal?.id ?? null };

export async function tickets(principal: Principal, station?: number): Promise<KdsTickets> {
    const storeId = principal.store_id;
    // ?station= → that one; a KDS screen, or a chef signed in at one → its station; else every station.
    const stationId =
        station ??
        (principal.kind === 'device'
            ? principal.kds_station_id
            : principal.terminal?.type === 'kds'
              ? await kitchen.terminalStation(principal.terminal.id)
              : null);
    const found = stationId ? await kitchen.findStation(storeId, stationId) : null;
    if (stationId && !found) throw new ApiError('Kitchen station not found.', 404, 'station');
    const [list, settings] = await Promise.all([kitchen.readTickets(storeId, found?.id ?? null), kitchen.kitchenSettings(storeId)]);
    return { station: found ?? null, tickets: list, stats: await kitchen.readStats(storeId, list), settings, server_time: new Date().toISOString() };
}

export async function complete(principal: Principal, orderId: number) {
    const done = await kitchen.completeOrder({ storeId: principal.store_id, orderId, ...actorOf(principal) });
    publish(principal.store_id, 'order.completed', done);
    return done;
}

export async function recall(principal: Principal, orderId: number) {
    const back = await kitchen.recallOrder({ storeId: principal.store_id, orderId, ...actorOf(principal) });
    publish(principal.store_id, 'order.recalled', back);
    return back;
}

export async function clearServed(principal: Principal) {
    const result = await kitchen.clearServed(principal.store_id);
    if (result.cleared) publish(principal.store_id, 'order.cleared', result);
    return result;
}
