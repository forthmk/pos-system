/* ──────────────────────────────────────────────────────────────────────────
 * DeleteDialog — a reusable confirmation dialog for destructive actions
 * (single or bulk deletes): ConfirmDialog with a red Delete.
 *
 * This is a PRESENTATIONAL ("dumb") component: it only renders the UI and
 * NEVER calls the API. The parent page owns all the logic:
 *   - `open`          -> the parent decides when to show/hide it
 *   - `onClose`       -> the parent cleans up its own state (e.g. clears the
 *                        rows-to-delete array) when the user cancels/closes
 *   - `onConfirm`     -> the parent performs the actual delete mutation
 *
 * Because of this, DeleteDialog can be dropped into ANY page — see
 * src/pages/Supplier/Supplier.tsx for a full working example.
 * ────────────────────────────────────────────────────────────────────────── */
import type { ReactNode } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface DeleteDialogProps {
    open: boolean; // whether the dialog is visible (controlled by the parent)
    onClose: () => void; // called when the user cancels/closes — parent cleans up
    title: string; // e.g. "Delete Suppliers" — shown as a question ("Delete Suppliers?")
    description?: ReactNode; // optional message; may contain JSX like <strong>3</strong>
    confirmLabel?: string; // text of the confirm button (default 'Delete')
    cancelLabel?: string; // text of the cancel button (default 'Cancel')
    confirmVariant?: 'primary' | 'destructive'; // 'destructive' = red button (default)
    isPending?: boolean; // while true, disables + shows a spinner on the confirm button
    onConfirm: () => void; // called when the user clicks the confirm button
}

const DeleteDialog = ({
    open,
    onClose,
    title,
    description,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    confirmVariant = 'destructive',
    isPending = false,
    onConfirm,
}: DeleteDialogProps) => (
    <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={onConfirm}
        // Asked as a question, like every confirm: "Delete Storage?".
        title={/[?!.]$/.test(title) ? title : `${title}?`}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        tone={confirmVariant === 'destructive' ? 'danger' : 'primary'}
        isPending={isPending}
    />
);

export default DeleteDialog;
