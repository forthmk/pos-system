import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
 * Dragging a Pending ticket into Completed Orders (design §5.6) — one
 * pointer-events implementation for mouse, finger and pen (HTML5 drag and
 * drop doesn't work with fingers on most tablets).
 *
 * - Mouse: drag the card from anywhere. Finger: drag from the "⠿ Drag or
 *   Tap ✓" handle (the rest of the card scrolls the page as usual).
 * - Starts after 8 px of movement, so a tap stays a tap.
 * - Near the top / bottom edge the page scrolls, so the drop zone can be
 *   reached on a small screen.
 * ────────────────────────────────────────────────────────────────────────── */

export interface DragState {
    orderId: number;
    x: number;
    y: number;
    /** Where the card was grabbed, inside the card. */
    grabX: number;
    grabY: number;
    width: number;
    overZone: boolean;
}

export function useTicketDrag(zone: RefObject<HTMLElement | null>, onDrop: (orderId: number) => void) {
    const [drag, setDrag] = useState<DragState | null>(null);
    const dropRef = useRef(onDrop);
    dropRef.current = onDrop;

    const start = useCallback(
        (orderId: number, e: ReactPointerEvent<HTMLElement>, card: HTMLElement) => {
            if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
            const rect = card.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            let active = false;

            const inZone = (x: number, y: number) => {
                const r = zone.current?.getBoundingClientRect();
                return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            };
            const move = (ev: PointerEvent) => {
                if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
                active = true;
                ev.preventDefault();
                if (ev.clientY > window.innerHeight - 80) window.scrollBy(0, 24);
                else if (ev.clientY < 80) window.scrollBy(0, -24);
                setDrag({ orderId, x: ev.clientX, y: ev.clientY, grabX: startX - rect.left, grabY: startY - rect.top, width: rect.width, overZone: inZone(ev.clientX, ev.clientY) });
            };
            const end = (ev: PointerEvent, dropped: boolean) => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                window.removeEventListener('pointercancel', cancel);
                if (active && dropped && inZone(ev.clientX, ev.clientY)) dropRef.current(orderId);
                setDrag(null);
            };
            const up = (ev: PointerEvent) => end(ev, true);
            const cancel = (ev: PointerEvent) => end(ev, false);
            window.addEventListener('pointermove', move, { passive: false });
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', cancel);
        },
        [zone],
    );

    return { drag, start };
}
