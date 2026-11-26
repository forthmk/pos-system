/* The ✕ that closes a dialog, drawer or panel — red and easy to spot, the
 * same everywhere: a light red circle with a red ✕, deeper on hover.
 *
 *   <DialogX />          inside a darwin Dialog (in place of <DialogClose />)
 *   className={CLOSE_X}  on our own close buttons (Modal, SidePanel…)
 *
 * Only for closing things; the small ✕ that clears a search box or removes
 * a chip keeps its quieter look. */
import { DialogClose } from '@pikoloo/darwin-ui';

export const CLOSE_X =
    'inline-flex shrink-0 items-center justify-center rounded-full bg-red-50 p-1.5 text-red-500 ring-1 ring-red-100 transition-colors hover:bg-red-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 [&>svg]:h-5 [&>svg]:w-5 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-900/50';

/** darwin's DialogClose, drawn red, in the same top-right spot in every
 *  dialog. `dialog-x` lets tailwind.css keep the dialog's title clear of it. */
export const DialogX = ({ className = '' }: { className?: string }) => (
    <DialogClose className={`dialog-x ${CLOSE_X} !right-5 !top-5 ${className}`} />
);
