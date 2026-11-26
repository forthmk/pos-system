/* Steps — a progress indicator for a record moving through fixed stages
 * (a purchase order's Draft → Pending → Confirmed → Delivered).
 *
 * An <ol> of labelled stages driven by one zero-based `current` index, from
 * which each stage's state is derived: before it → complete (a check in
 * place of the number), at it → current (filled, with a halo, and
 * aria-current="step"), after it → upcoming (muted). Adjacent stages are
 * joined by a Separator, coloured once the stage before it is complete.
 * `current` equal to the number of steps marks every stage complete. */
import { Check } from 'lucide-react';

export type StepState = 'complete' | 'current' | 'upcoming';

export const stepState = (index: number, current: number): StepState =>
    index < current ? 'complete' : index === current ? 'current' : 'upcoming';

const SR_STATE: Record<StepState, string> = {
    complete: 'completed',
    current: 'current step',
    upcoming: 'not started',
};

/** The numbered circle; a check once the stage is complete. */
const Indicator = ({ state, number }: { state: StepState; number: number }) => (
    <span
        aria-hidden="true"
        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            state === 'complete'
                ? 'border-2 border-blue-500 bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400'
                : state === 'current'
                  ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-500/25'
                  : 'border-2 border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900'
        }`}
    >
        {state === 'complete' ? <Check className="h-4 w-4" strokeWidth={2.5} /> : number}
    </span>
);

/** The line from one stage's circle to the next one's (h-9 circles → centre
 *  at 18px; it stops 6px short of each circle). */
const Separator = ({ complete }: { complete: boolean }) => (
    <span
        aria-hidden="true"
        className={`absolute top-[17px] left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 rounded-full transition-colors ${
            complete ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}
    />
);

interface StepsProps {
    /** Each stage's label, in order. */
    steps: string[];
    /** Zero-based index of the current stage. */
    current: number;
    'aria-label'?: string;
    className?: string;
}

const Steps = ({ steps, current, 'aria-label': ariaLabel = 'Progress', className = '' }: StepsProps) => (
    <ol aria-label={ariaLabel} className={`flex w-full ${className}`}>
        {steps.map((label, i) => {
            const state = stepState(i, current);
            return (
                <li
                    key={label}
                    aria-current={state === 'current' ? 'step' : undefined}
                    className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
                >
                    {i < steps.length - 1 && <Separator complete={state === 'complete'} />}
                    <Indicator state={state} number={i + 1} />
                    <span
                        className={`text-xs sm:text-sm ${
                            state === 'current'
                                ? 'font-semibold text-gray-900 dark:text-white'
                                : state === 'complete'
                                  ? 'font-medium text-slate-600 dark:text-slate-300'
                                  : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        {label}
                        <span className="sr-only">, {SR_STATE[state]}</span>
                    </span>
                </li>
            );
        })}
    </ol>
);

Steps.Indicator = Indicator;
Steps.Separator = Separator;

export default Steps;
