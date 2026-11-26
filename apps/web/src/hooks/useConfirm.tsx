/* useConfirm — ask "are you sure?" from inside a handler and wait for the
 * answer:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   const onSubmit = async (data) => {
 *       if (isEdit && !(await confirm(SAVE_CHANGES))) return;
 *       update(data);
 *   };
 *   return <>…{confirmDialog}</>;
 *
 * Resolves true on the action, false on Cancel / ✕ / Escape / backdrop.
 * Render `confirmDialog` once in the component that calls `confirm`. */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import ConfirmDialog, { type ConfirmDialogProps } from '../components/dialogs/ConfirmDialog';

export type ConfirmOptions = Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'cancelLabel' | 'tone'>;

/** The edit forms' "Save changes?" question. */
export const SAVE_CHANGES: ConfirmOptions = {
    title: 'Save changes?',
    description: 'Are you sure you want to save these changes?',
    confirmLabel: 'Save Changes',
};

export const useConfirm = (): { confirm: (options: ConfirmOptions) => Promise<boolean>; confirmDialog: ReactNode } => {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((answer: boolean) => void) | null>(null);

    const settle = useCallback((answer: boolean) => {
        resolver.current?.(answer);
        resolver.current = null;
        setOptions(null);
    }, []);

    const confirm = useCallback((next: ConfirmOptions) => {
        resolver.current?.(false);
        setOptions(next);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const onClose = useCallback(() => settle(false), [settle]);

    const confirmDialog = (
        <ConfirmDialog
            open={options !== null}
            title={options?.title ?? ''}
            description={options?.description}
            confirmLabel={options?.confirmLabel}
            cancelLabel={options?.cancelLabel}
            tone={options?.tone}
            onClose={onClose}
            onConfirm={() => settle(true)}
        />
    );

    return { confirm, confirmDialog };
};
