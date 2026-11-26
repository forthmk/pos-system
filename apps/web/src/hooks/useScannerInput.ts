import { useEffect, useRef } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
 * The barcode scanner works like a keyboard: it types the code very fast and
 * presses Enter (design §5.10). This listens on the whole page — no box needs
 * to be selected — and calls onScan with the digits when ≥ `minLength` digits
 * arrived less than `maxGapMs` apart and ended with Enter. Typing by a person
 * (slower) is ignored, and so is anything typed into a text box (that box
 * handles its own Enter).
 * ────────────────────────────────────────────────────────────────────────── */
export function useScannerInput({
    onScan,
    enabled = true,
    minLength = 12,
    maxGapMs = 50,
}: {
    onScan: (code: string) => void;
    enabled?: boolean;
    minLength?: number;
    maxGapMs?: number;
}) {
    const buffer = useRef('');
    const last = useRef(0);
    const handler = useRef(onScan);
    handler.current = onScan;

    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            const now = performance.now();
            if (e.key === 'Enter') {
                if (buffer.current.length >= minLength) {
                    e.preventDefault();
                    handler.current(buffer.current);
                }
                buffer.current = '';
                return;
            }
            if (!/^\d$/.test(e.key)) return;
            // A gap longer than a scanner's means a person is typing: start over.
            buffer.current = now - last.current > maxGapMs ? e.key : buffer.current + e.key;
            last.current = now;
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enabled, minLength, maxGapMs]);
}
