import { useEffect, useState } from 'react';

// The part of the screen the user can actually see. On phones and tablets the
// on-screen keyboard covers the bottom of the page (iPad Safari, iOS), so
// anything pinned to the bottom ends up behind it or pushed off the top.
// `top` / `height` describe the visible area in page coordinates; when the
// keyboard is up, `height` is the space left above it.
export type VisibleArea = { top: number; height: number };

const read = (): VisibleArea | null => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    return vv ? { top: vv.offsetTop, height: vv.height } : null;
};

export function useVisualViewport(enabled = true): VisibleArea | null {
    const [area, setArea] = useState<VisibleArea | null>(() => (enabled ? read() : null));

    useEffect(() => {
        const vv = window.visualViewport;
        if (!enabled || !vv) return;
        const update = () => setArea(read());
        update();
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        // Safari also scrolls the page itself to show the focused input.
        window.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
            window.removeEventListener('scroll', update);
        };
    }, [enabled]);

    return enabled ? area : null;
}
