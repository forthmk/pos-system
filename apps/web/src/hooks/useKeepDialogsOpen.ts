/* useKeepDialogsOpen — a click on a dialog's dimmed backdrop no longer
 * closes it. A dialog (a form half filled in, a confirm) stays open until
 * the user presses Cancel, ✕ or its action; Escape still closes it.
 *
 * darwin-ui's Dialog closes on a backdrop click (its overlay's own onClick)
 * and has no prop to turn that off, so this catches the click first: a
 * window listener in the capture phase runs before React's root listener,
 * and a click whose target is the overlay itself — the element holding the
 * aria-modal panel, not anything inside the panel — is stopped there.
 * Mounted once, in App. */
import { useEffect } from 'react';

const PANEL = ':scope > [aria-modal="true"], :scope > * > [aria-modal="true"]';

export const useKeepDialogsOpen = () => {
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            const panel = target.querySelector(PANEL);
            if (panel && !panel.contains(target)) e.stopPropagation();
        };
        window.addEventListener('click', onClick, true);
        return () => window.removeEventListener('click', onClick, true);
    }, []);
};
