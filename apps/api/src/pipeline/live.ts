/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · live — pushes what just happened to every screen of the store
 * (design §8.2). The kiosk, the register and the kitchen display connect once
 * to GET /api/live (WebSocket); when an order changes, the pipeline publishes
 * an event and each screen refreshes what it shows — no reloading, no polling.
 *
 *   order.created          kiosk order saved, waiting for payment   → register (Kiosk #)
 *   order.sent_to_kitchen  paid (walk-in, settled kiosk order)       → kitchen, board, register
 *   order.locked / order.released   a slip scanned / let go          → register (Kiosk #)
 *   order.completed / order.recalled / order.cleared                 → kitchen, board
 *   order.cancelled        unpaid order cancelled / expired          → register, kitchen
 *   order.voided           paid order voided + refunded (manager)    → kitchen, board, reports
 *   shift.closed           shift closed, Z-reading saved             → register, reports
 *   menu.availability      item / extra sold out or back             → kiosk, register
 *
 * Every event carries `server_time` so a screen with a wrong clock still
 * shows the right timers.
 * ────────────────────────────────────────────────────────────────────────── */

export type LiveEventName =
    | 'order.created'
    | 'order.sent_to_kitchen'
    | 'order.locked'
    | 'order.released'
    | 'order.completed'
    | 'order.recalled'
    | 'order.cleared'
    | 'order.cancelled'
    | 'order.voided'
    | 'shift.closed'
    | 'menu.availability';

/** The bit of a WebSocket the hub needs (easy to fake in tests). */
export interface LiveSocket {
    readyState: number;
    send(data: string): void;
}

interface Client {
    socket: LiveSocket;
    storeId: number;
}

const OPEN = 1;
const clients = new Set<Client>();

export function join(socket: LiveSocket, storeId: number): () => void {
    const client = { socket, storeId };
    clients.add(client);
    return () => clients.delete(client);
}

export const connectedCount = (storeId?: number) => [...clients].filter((c) => storeId === undefined || c.storeId === storeId).length;

export function publish(storeId: number, event: LiveEventName, data: Record<string, unknown> = {}) {
    const message = JSON.stringify({ event, data, server_time: new Date().toISOString() });
    for (const c of clients) {
        if (c.storeId !== storeId || c.socket.readyState !== OPEN) continue;
        try {
            c.socket.send(message);
        } catch {
            clients.delete(c);
        }
    }
}

/** Tests only. */
export const resetLive = () => clients.clear();
