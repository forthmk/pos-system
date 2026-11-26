/* ──────────────────────────────────────────────────────────────────────────
 * ConfirmDialog — the one "are you sure?" dialog: delete, save changes, log
 * out. A short question as the title ("Delete storage?"), a line saying what
 * will happen, ✕ at the top right, then Cancel and the action at the bottom
 * right — red for destructive (Delete, Log out), blue otherwise (Save).
 *
 * Presentational: the parent owns `open`, `onClose` and `onConfirm` (see
 * DeleteDialog for deletes, useConfirm for awaiting an answer in a submit).
 *
 * Built on darwin-ui's Dialog, which already gives it a dimmed, blurred
 * backdrop over the page (aria-modal), locks the page's scroll and puts focus
 * back on the button that opened it. One thing it gets wrong for a confirm:
 * every open darwin Dialog closes on Escape from a document-wide listener, so
 * a confirm opened over an Edit form would take the form down with it on one
 * Escape — losing the user's changes. While this is open, Escape is caught
 * first (window, capture phase) and closes only this dialog.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, type ReactNode } from 'react';
import { Button, Dialog, DialogContent } from '@pikoloo/darwin-ui';
import { DialogX } from '../ui/CloseX';

export interface ConfirmDialogProps {
    open: boolean;
    /** Cancel, ✕, Escape or a click on the backdrop. */
    onClose: () => void;
    onConfirm: () => void;
    /** A question: "Delete storage?", "Save changes?", "Log out?". */
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' — a red action (delete, log out); 'primary' — blue (save). */
    tone?: 'danger' | 'primary';
    /** While true, the action shows a spinner and can't be pressed again. */
    isPending?: boolean;
}

const ConfirmDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'primary',
    isPending = false,
}: ConfirmDialogProps) => {
    // Escape closes this dialog only, never a dialog underneath it.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopImmediatePropagation();
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose]);

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent size="sm" className="!rounded-2xl">
                <DialogX />
                <div className="p-6">
                    <h2 className="pr-8 text-xl font-bold leading-snug text-gray-900 dark:text-white">{title}</h2>
                    {description && (
                        <div className="mt-2 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                            {description}
                        </div>
                    )}
                    <div className="mt-6 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            {cancelLabel}
                        </button>
                        <Button
                            variant={tone === 'danger' ? 'destructive' : 'primary'}
                            onClick={onConfirm}
                            disabled={isPending}
                            loading={isPending}
                            className="!rounded-xl !px-5 !py-2.5 !text-sm !font-semibold"
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmDialog;
