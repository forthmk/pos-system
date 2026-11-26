/* Progress indicators — pick by what is known about the remaining work:
 *
 *   Spinner       indeterminate: "still working, no idea how long" (an AI
 *                 read of a receipt or sheet, a page loading). A track with
 *                 an arc turning on it; role="progressbar" with no value,
 *                 which is how ARIA says "busy, amount unknown".
 *   ProgressRing  determinate, compact: a circular arc filling toward 100.
 *   ProgressBar   determinate, where there is room for a readable track: a
 *                 native <progress> (track behind, fill on top) with the
 *                 percentage beside it.
 *
 * The ring and bar take `value` 0–100 and expose that same number to
 * assistive tech (aria-valuenow / the <progress> value) as they show. */

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const SPINNER_SIZE = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10', xl: 'h-30 w-30' } as const;

interface SpinnerProps {
    /** What is happening, for screen readers: "Reading the receipt". */
    label: string;
    size?: keyof typeof SPINNER_SIZE;
    className?: string;
    /** Colours for a dark or coloured background (Ask Bee's panel, a gold
     *  button): the track behind and the turning arc. */
    trackClassName?: string;
    arcClassName?: string;
}

export const Spinner = ({
    label,
    size = 'md',
    className = '',
    trackClassName = 'text-blue-100 dark:text-slate-700',
    arcClassName = 'text-blue-500',
}: SpinnerProps) => (
    <span role="progressbar" aria-label={label} className={`inline-block shrink-0 ${SPINNER_SIZE[size]} ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full animate-spin motion-reduce:animate-[spin_3s_linear_infinite]">
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" className={trackClassName} />
            <path
                d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className={arcClassName}
            />
        </svg>
    </span>
);

interface ProgressRingProps {
    /** 0–100. */
    value: number;
    label: string;
    /** Diameter in px. */
    size?: number;
    /** The percentage in the middle of the ring. */
    showValue?: boolean;
}

export const ProgressRing = ({ value, label, size = 40, showValue = false }: ProgressRingProps) => {
    const pct = clamp(value);
    const r = 15.5;
    const circumference = 2 * Math.PI * r;
    return (
        <span
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="relative inline-flex shrink-0 items-center justify-center"
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" fill="none">
                <circle cx="18" cy="18" r={r} stroke="currentColor" strokeWidth="3.5" className="text-slate-200 dark:text-slate-700" />
                <circle
                    cx="18"
                    cy="18"
                    r={r}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct / 100)}
                    className="text-blue-500 transition-[stroke-dashoffset] duration-300"
                />
            </svg>
            {showValue && (
                <span aria-hidden="true" className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-200">
                    {pct}%
                </span>
            )}
        </span>
    );
};

interface ProgressBarProps {
    /** 0–100. */
    value: number;
    label: string;
    className?: string;
}

export const ProgressBar = ({ value, label, className = '' }: ProgressBarProps) => {
    const pct = clamp(value);
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <progress
                aria-label={label}
                max={100}
                value={pct}
                className="h-2 min-w-0 flex-1 appearance-none overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-blue-500 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-blue-500 [&::-webkit-progress-value]:transition-[width]"
            />
            <span aria-hidden="true" className="w-10 shrink-0 text-right text-sm tabular-nums text-slate-500">
                {pct}%
            </span>
        </div>
    );
};

/** A page or panel still loading: the spinner with a word under it.
 *  `fullPage` — a whole page loading (the layouts' Suspense fallback):
 *  centred on the screen, with a spinner three times the panel size. */
export const LoadingState = ({
    label = 'Loading…',
    className = '',
    fullPage = false,
}: {
    label?: string;
    className?: string;
    fullPage?: boolean;
}) => (
    <div
        className={`flex flex-col items-center justify-center gap-4 font-medium text-slate-500 ${
            fullPage ? 'min-h-[calc(100dvh-8rem)] text-base' : 'py-16 text-sm'
        } ${className}`}
    >
        <Spinner label={label} size={fullPage ? 'xl' : 'lg'} />
        <span aria-hidden="true">{label}</span>
    </div>
);
