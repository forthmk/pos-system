/* ──────────────────────────────────────────────────────────────────────────
 * DidYouMean — under a name box whose text isn't one of the names (typed
 * wrong, or misread from a photo): the error, then the closest names as
 * buttons; tapping one fills the box.
 *
 *   ⚠ "Boromeo" isn't one of the stores.
 *   Did you mean:  [LNT Borromeo]
 *
 * Nothing close: the error says to choose from the list instead.
 * ────────────────────────────────────────────────────────────────────────── */
import { useMemo } from 'react';
import FieldError from './FieldError';
import { closestNames } from '../../utils/closestNames';

interface DidYouMeanProps {
    /** What is in the box. */
    typed: string;
    /** Every name it could be. */
    names: string[];
    /** "store", "product" — for the message. */
    noun: string;
    onPick: (name: string) => void;
}

const DidYouMean = ({ typed, names, noun, onPick }: DidYouMeanProps) => {
    const close = useMemo(() => closestNames(names, typed), [names, typed]);
    const text = typed.trim();
    return (
        <div className="mt-1">
            <FieldError
                message={close.length ? `"${text}" isn't one of the ${noun}s.` : `"${text}" isn't one of the ${noun}s. Choose one from the list.`}
            />
            {close.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">Did you mean:</span>
                    {close.map((name) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => onPick(name)}
                            className="min-h-9 rounded-full border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200"
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DidYouMean;
