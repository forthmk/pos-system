/* ──────────────────────────────────────────────────────────────────────────
 * SidePanel — a right-hand slide-over for showing detail beside a list
 * without leaving it.
 *
 * Used where a modal would be wrong: the Inventory page's per-item history is
 * a wide, scrollable table the user reads while keeping their place in the
 * list, and closing it must land them back on the same row and page. Purely
 * presentational — it takes a title, an optional subtitle and children, and
 * reports closing upward. The parent decides what to render and when.
 *
 * Mounted only while open (the parent guards on its own state), so children
 * don't fetch in the background for a panel nobody is looking at. Because the
 * parent unmounts it the moment `onClose` fires, the panel plays its own exit
 * animation first and only then calls `onClose`.
 * ────────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { CLOSE_X } from '../ui/CloseX';

interface SidePanelProps {
    title: ReactNode;
    subtitle?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    /** Tailwind max-width for the sheet. Wide by default — these hold tables. */
    widthClassName?: string;
}

const SLIDE_SECONDS = 0.25;

const SidePanel = ({
    title,
    subtitle,
    onClose,
    children,
    widthClassName = 'max-w-4xl',
}: SidePanelProps) => {
    const reduceMotion = useReducedMotion();
    const duration = reduceMotion ? 0 : SLIDE_SECONDS;

    // `open` drives the animation; the parent's onClose is called once it has
    // finished. The timer is a backstop so the panel always closes even if the
    // animation never reports back (hidden tab, animations switched off).
    const [open, setOpen] = useState(true);
    const finishedRef = useRef(false);
    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onClose();
    }, [onClose]);
    const requestClose = useCallback(() => {
        setOpen(false);
        window.setTimeout(finish, (duration + 0.1) * 1000);
    }, [finish, duration]);

    // Escape closes it, matching the app's dialogs. Bound on document because
    // the panel isn't focused when it opens — the row the user clicked is.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') requestClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [requestClose]);

    return (
        <AnimatePresence onExitComplete={finish}>
            {open && (
                <div key="side-panel" className="fixed inset-0 z-[60] flex justify-end">
                    <motion.div
                        className="absolute inset-0 bg-black/40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration }}
                        onClick={requestClose}
                    />
                    <motion.div
                        className={`relative z-10 w-full ${widthClassName} h-full bg-white dark:bg-slate-800 shadow-xl flex flex-col`}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-gray-200 dark:border-slate-700 shrink-0">
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={requestClose}
                                aria-label="Close"
                                className={CLOSE_X}
                            >
                                <X />
                            </button>
                        </div>
                        <div className="px-5 py-4 overflow-y-auto grow">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SidePanel;
