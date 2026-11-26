import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LiveMessage } from '@shared/model';

/* ──────────────────────────────────────────────────────────────────────────
 * The live feed (design §8.2): one WebSocket to GET /api/live. When the
 * server says something changed, the matching TanStack queries refresh —
 * the kitchen gets a new ticket, the board a new number, the register's
 * Kiosk # list a new order — without reloading or polling.
 *
 *   const { online, clockOffset } = useLiveFeed();
 *
 * - Lost connection → `online` false (the screen shows "Offline"), retried
 *   every 1 → 2 → 4 … 15 s; on reconnect every live query reloads, so nothing
 *   missed while offline stays missing (design §5.6).
 * - `clockOffset` = server time − this screen's time (ms): timers count from
 *   the server's clock even when a tablet's clock is wrong.
 * ────────────────────────────────────────────────────────────────────────── */

// Which screens' data each event changes (query keys from hooks/api/*).
const REFRESH: Record<string, string[][]> = {
    'order.created': [['pos-kiosk-queue']],
    'order.locked': [['pos-kiosk-queue']],
    'order.released': [['pos-kiosk-queue']],
    'order.cancelled': [['pos-kiosk-queue']],
    'order.sent_to_kitchen': [['kds-tickets'], ['orders-board'], ['pos-kiosk-queue'], ['pos-next-number'], ['pos-report']],
    'order.voided': [['kds-tickets'], ['orders-board'], ['pos-report']],
    'shift.closed': [['pos-shift'], ['pos-shifts'], ['pos-report']],
    'order.completed': [['kds-tickets'], ['orders-board']],
    'order.recalled': [['kds-tickets'], ['orders-board']],
    'order.cleared': [['kds-tickets'], ['orders-board']],
    'menu.availability': [['kiosk-menu'], ['pos-menu']],
};
const EVERYTHING = [...new Set(Object.values(REFRESH).flat().map((k) => k[0]))].map((k) => [k]);

/** ws(s)://<host>/api/live?token=… — from VITE_API_URL ("/api" behind the Vite proxy, or a full URL). */
const liveUrl = (token: string) => {
    const api = new URL(import.meta.env.VITE_API_URL ?? '/api', window.location.href);
    api.protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
    api.pathname = `${api.pathname.replace(/\/$/, '')}/live`;
    api.search = `?token=${encodeURIComponent(token)}`;
    return api.toString();
};

export function useLiveFeed(onMessage?: (m: LiveMessage) => void) {
    const qc = useQueryClient();
    const [online, setOnline] = useState(false);
    const [clockOffset, setClockOffset] = useState(0);
    const handler = useRef(onMessage);
    handler.current = onMessage;

    useEffect(() => {
        let socket: WebSocket | null = null;
        let retry: ReturnType<typeof setTimeout> | undefined;
        let delay = 1000;
        let stopped = false;
        let connectedBefore = false;

        const refresh = (keys: string[][]) => keys.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));

        const connect = () => {
            const token = localStorage.getItem('token');
            if (!token) {
                retry = setTimeout(connect, 5000);
                return;
            }
            socket = new WebSocket(liveUrl(token));
            socket.onopen = () => {
                delay = 1000;
                setOnline(true);
                // Back after a drop: reload what may have changed meanwhile.
                if (connectedBefore) refresh(EVERYTHING);
                connectedBefore = true;
            };
            socket.onmessage = (e) => {
                let msg: LiveMessage;
                try {
                    msg = JSON.parse(e.data as string);
                } catch {
                    return;
                }
                if (msg.server_time) setClockOffset(Date.parse(msg.server_time) - Date.now());
                refresh(REFRESH[msg.event] ?? []);
                handler.current?.(msg);
            };
            socket.onclose = () => {
                setOnline(false);
                if (stopped) return;
                retry = setTimeout(connect, delay);
                delay = Math.min(delay * 2, 15_000);
            };
        };
        connect();

        return () => {
            stopped = true;
            clearTimeout(retry);
            socket?.close();
        };
    }, [qc]);

    return { online, clockOffset };
}
