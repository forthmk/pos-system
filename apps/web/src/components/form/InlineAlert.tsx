/* ──────────────────────────────────────────────────────────────────────────
 * InlineAlert — success/error notification rendered INSIDE a modal,
 * matching sileo's actual toast structure (dark card, tinted circular
 * badge icon + colored capitalized title in a header row, description
 * below) — see node_modules/sileo/dist/styles.css for the reference
 * ([data-sileo-badge], [data-sileo-title], [data-sileo-description]) —
 * but anchored to the modal's own card instead of the viewport, since
 * sileo's Toaster only supports 6 fixed VIEWPORT corners with no way to
 * scope it inside a container. Auto-dismisses after 3 seconds.
 *
 * The parent modal's body wrapper must be `position: relative` (or a
 * positioned ancestor) so this anchors to just that area, not the whole
 * page — `pointer-events-none` on the outer layer lets clicks reach the
 * form underneath everywhere except the card itself.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { CLOSE_X } from '../ui/CloseX';

interface InlineAlertProps {
    type: 'success' | 'error';
    title: string;
    message: string;
    onDismiss: () => void;
}

const InlineAlert = ({ type, title, message, onDismiss }: InlineAlertProps) => {
    const isSuccess = type === 'success';
    const tone = isSuccess ? 'text-green-500' : 'text-red-500';
    const toneBg = isSuccess ? 'bg-green-500/20' : 'bg-red-500/20';

    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
            <div className="pointer-events-auto w-72 max-w-[calc(100vw-2rem)] rounded-2xl shadow-xl bg-zinc-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3.5">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${toneBg} ${tone}`}>
                        {isSuccess ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </span>
                    <span className={`text-[13px] font-medium capitalize ${tone}`}>{title}</span>
                    <button
                        type="button"
                        onClick={onDismiss}
                        className={`ml-auto ${CLOSE_X}`}
                        aria-label="Dismiss"
                    >
                        <X />
                    </button>
                </div>
                <p className="text-white/90 text-sm px-4 py-3.5">{message}</p>
            </div>
        </div>
    );
};

export default InlineAlert;
