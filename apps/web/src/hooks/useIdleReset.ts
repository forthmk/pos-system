import { useCallback, useEffect, useRef, useState } from 'react';

// Kiosk idle timer (design §5.1): no touch for `idleSeconds` → "Still there?"
// with a countdown of `graceSeconds`; any touch keeps going, the countdown
// running out calls onReset. Off while `enabled` is false (start screen).
export function useIdleReset({
    enabled,
    idleSeconds,
    graceSeconds = 15,
    onReset,
}: {
    enabled: boolean;
    idleSeconds: number;
    graceSeconds?: number;
    onReset: () => void;
}) {
    const [prompting, setPrompting] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(graceSeconds);
    const idleTimer = useRef<number | undefined>(undefined);
    const resetRef = useRef(onReset);
    resetRef.current = onReset;

    const arm = useCallback(() => {
        window.clearTimeout(idleTimer.current);
        if (!enabled) return;
        idleTimer.current = window.setTimeout(() => {
            setSecondsLeft(graceSeconds);
            setPrompting(true);
        }, idleSeconds * 1000);
    }, [enabled, idleSeconds, graceSeconds]);

    // Any touch, click or key restarts the wait (but not while the prompt is up:
    // the prompt's own buttons decide).
    useEffect(() => {
        if (!enabled) {
            window.clearTimeout(idleTimer.current);
            setPrompting(false);
            return;
        }
        arm();
        const onActivity = () => {
            if (!prompting) arm();
        };
        const events = ['pointerdown', 'keydown', 'wheel'] as const;
        events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
        return () => {
            window.clearTimeout(idleTimer.current);
            events.forEach((e) => window.removeEventListener(e, onActivity));
        };
    }, [enabled, arm, prompting]);

    useEffect(() => {
        if (!prompting) return;
        if (secondsLeft <= 0) {
            setPrompting(false);
            resetRef.current();
            return;
        }
        const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => window.clearTimeout(t);
    }, [prompting, secondsLeft]);

    const keepGoing = useCallback(() => {
        setPrompting(false);
        arm();
    }, [arm]);

    return { prompting, secondsLeft, keepGoing };
}
