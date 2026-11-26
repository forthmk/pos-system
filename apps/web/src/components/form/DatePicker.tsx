/* ──────────────────────────────────────────────────────────────────────────
 * DatePicker — the one date field: a button showing the date that opens a
 * calendar popover (darwin-ui Popover + react-day-picker's DayPicker, the
 * shadcn Popover + Calendar pattern). DateRangePicker is the same with
 * mode="range": the ends get range_start / range_end, the days between are
 * tinted (range_middle).
 *
 * Values are civil dates — 'yyyy-mm-dd' strings, exactly what
 * <input type="date"> gave — built and read with local-time parts, never
 * `new Date('yyyy-mm-dd')` (parsed as UTC midnight, a day early here). The
 * week starts per the browser's locale; the calendar keeps DayPicker's grid
 * keyboard: arrows by day and week, PageUp / PageDown by month, Home / End.
 *
 * FormDatePicker wires one into the surrounding <Form> (react-hook-form),
 * with `withTime` adding a time box for 'yyyy-mm-ddTHH:mm' fields.
 * ────────────────────────────────────────────────────────────────────────── */
import { useState, type CSSProperties } from 'react';
import { DayPicker, getDefaultClassNames, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Popover, PopoverContent, PopoverTrigger } from '@pikoloo/darwin-ui';
import { CalendarDays, X } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import FieldError from './FieldError';
import { fromDateOnly, toDateOnly } from '../../utils/dateOnly';
import { useShakeOnError } from '../../hooks/useShakeOnError';

// ── civil dates ──────────────────────────────────────────────────────────────
const show = (value?: string) =>
    fromDateOnly(value)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// The browser locale's first day of the week (0 = Sunday), where the
// browser says; Sunday otherwise, as in the Philippines.
const weekStartsOn = (() => {
    try {
        const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
            getWeekInfo?: () => { firstDay: number };
            weekInfo?: { firstDay: number };
        };
        const first = locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay;
        return first ? ((first % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6) : 0;
    } catch {
        return 0;
    }
})();

// ── look ─────────────────────────────────────────────────────────────────────
const defaults = getDefaultClassNames();
const CALENDAR_STYLE = {
    '--rdp-accent-color': '#2563eb',
    '--rdp-accent-background-color': '#dbeafe',
    '--rdp-day-height': '2.5rem',
    '--rdp-day-width': '2.5rem',
    '--rdp-day_button-height': '2.375rem',
    '--rdp-day_button-width': '2.375rem',
} as CSSProperties;

// react-day-picker's own stylesheet isn't in a CSS layer, so it beats
// Tailwind's utilities — hence the ! on every override here. The app's
// table styles pad <th>/<td>; the calendar grid wants none.
const CALENDAR_CLASSES = {
    root: `${defaults.root} text-sm text-slate-800 dark:text-slate-100`,
    caption_label: `${defaults.caption_label} text-base font-bold`,
    weekday: `${defaults.weekday} !p-0 !pb-1 !text-xs !font-semibold !text-slate-400`,
    day: `${defaults.day} !p-0`,
    week: `${defaults.week} !border-0 !bg-transparent`,
    weekdays: `${defaults.weekdays} !border-0 !bg-transparent`,
    day_button: `${defaults.day_button} !rounded-full !font-medium focus-visible:!outline-2 focus-visible:!outline-blue-500 hover:!bg-blue-50 dark:hover:!bg-slate-700`,
    today: `${defaults.today} font-extrabold !text-blue-600`,
    selected: `${defaults.selected} [&>button]:!border-0 [&>button]:!bg-blue-600 [&>button]:!font-bold [&>button]:!text-white`,
    range_middle: `${defaults.range_middle} [&>button]:!bg-transparent [&>button]:!text-blue-900 dark:[&>button]:!text-blue-100`,
    disabled: `${defaults.disabled} !opacity-30 [&>button]:hover:!bg-transparent`,
    nav: `${defaults.nav} [&_svg]:!fill-blue-600`,
};

const FIELD =
    'flex h-10 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-slate-800 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 aria-[invalid=true]:border-red-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

interface Bounds {
    /** Earliest pickable day, 'yyyy-mm-dd'. */
    min?: string;
    /** Latest pickable day, 'yyyy-mm-dd'. */
    max?: string;
}

const disabledDays = ({ min, max }: Bounds) => {
    const before = fromDateOnly(min);
    const after = fromDateOnly(max);
    return [...(before ? [{ before }] : []), ...(after ? [{ after }] : [])];
};

// ── single date ──────────────────────────────────────────────────────────────
interface DatePickerProps extends Bounds {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    invalid?: boolean;
    describedBy?: string;
    className?: string;
    /** Shows an ✕ that empties the field. */
    clearable?: boolean;
}

export const DatePicker = ({
    value,
    onChange,
    placeholder = 'Pick a date',
    id,
    invalid,
    describedBy,
    className = '',
    clearable = false,
    ...bounds
}: DatePickerProps) => {
    const [open, setOpen] = useState(false);
    const selected = fromDateOnly(value);
    return (
        // The Popover's own wrapper is inline; stretch it so the field fills.
        <div className={`relative [&>div:first-child]:!flex [&>div:first-child]:w-full ${className}`}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild className="flex w-full">
                    <button
                        type="button"
                        id={id}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-invalid={invalid || undefined}
                        aria-describedby={describedBy}
                        className={`${FIELD} ${clearable && value ? 'pr-9' : ''}`}
                    >
                        <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                        <span className={`truncate ${value ? 'font-semibold' : 'text-slate-400'}`}>
                            {show(value) ?? placeholder}
                        </span>
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="!w-auto !p-3">
                    <DayPicker
                        mode="single"
                        autoFocus
                        selected={selected}
                        defaultMonth={selected}
                        onSelect={(day) => {
                            if (day) onChange(toDateOnly(day));
                            setOpen(false);
                        }}
                        disabled={disabledDays(bounds)}
                        weekStartsOn={weekStartsOn}
                        showOutsideDays
                        style={CALENDAR_STYLE}
                        classNames={CALENDAR_CLASSES}
                    />
                </PopoverContent>
            </Popover>
            {clearable && value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Clear date"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

// ── date range ───────────────────────────────────────────────────────────────
export interface CivilRange {
    from?: string;
    to?: string;
}

interface DateRangePickerProps extends Bounds {
    value: CivilRange;
    onChange: (value: CivilRange) => void;
    placeholder?: string;
    id?: string;
    className?: string;
}

export const DateRangePicker = ({
    value,
    onChange,
    placeholder = 'Pick dates',
    id,
    className = '',
    ...bounds
}: DateRangePickerProps) => {
    const [open, setOpen] = useState(false);
    const selected: DateRange | undefined = value.from
        ? { from: fromDateOnly(value.from), to: fromDateOnly(value.to) }
        : undefined;
    const label = value.from ? `${show(value.from)}${value.to ? ` – ${show(value.to)}` : ''}` : placeholder;
    return (
        // The Popover's own wrapper is inline; stretch it so the field fills.
        <div className={`relative [&>div:first-child]:!flex [&>div:first-child]:w-full ${className}`}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild className="flex w-full">
                    <button type="button" id={id} aria-haspopup="dialog" aria-expanded={open} className={`${FIELD} ${value.from ? 'pr-9' : ''}`}>
                        <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                        <span className={`truncate ${value.from ? 'font-semibold' : 'text-slate-400'}`}>{label}</span>
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="!w-auto !p-3">
                    <DayPicker
                        mode="range"
                        autoFocus
                        selected={selected}
                        defaultMonth={selected?.from}
                        onSelect={(range) => {
                            const next = { from: range?.from && toDateOnly(range.from), to: range?.to && toDateOnly(range.to) };
                            onChange(next);
                            // Done once both ends are picked (and they differ).
                            if (next.from && next.to && next.from !== next.to) setOpen(false);
                        }}
                        disabled={disabledDays(bounds)}
                        weekStartsOn={weekStartsOn}
                        showOutsideDays
                        style={CALENDAR_STYLE}
                        classNames={CALENDAR_CLASSES}
                    />
                </PopoverContent>
            </Popover>
            {value.from && (
                <button
                    type="button"
                    onClick={() => onChange({})}
                    aria-label="Clear dates"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

// ── inside a <Form> ──────────────────────────────────────────────────────────
interface FormDatePickerProps extends Bounds {
    name: string;
    label: string;
    required?: boolean;
    /** The value is 'yyyy-mm-ddTHH:mm' (datetime-local's shape): a time box
     *  sits beside the calendar field. */
    withTime?: boolean;
}

export const FormDatePicker = ({ name, label, required, withTime = false, ...bounds }: FormDatePickerProps) => {
    const {
        control,
        formState: { errors },
    } = useFormContext();
    const error = errors[name]?.message as string | undefined;
    const shake = useShakeOnError(!!error);
    const errorId = `${name}-error`;
    return (
        <div className={shake}>
            <label htmlFor={name} className="mb-1 block text-sm font-medium">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => {
                    const raw = String(field.value ?? '');
                    const [date = '', time = ''] = raw.split('T');
                    const set = (d: string, t: string) => field.onChange(withTime && d ? `${d}T${t || '00:00'}` : d);
                    return (
                        <div className="flex gap-2">
                            <DatePicker
                                id={name}
                                value={date}
                                onChange={(d) => set(d, time.slice(0, 5))}
                                invalid={!!error}
                                describedBy={error ? errorId : undefined}
                                className="min-w-0 flex-1"
                                {...bounds}
                            />
                            {withTime && (
                                <input
                                    type="time"
                                    aria-label={`${label} time`}
                                    value={time.slice(0, 5)}
                                    onChange={(e) => set(date, e.target.value)}
                                    disabled={!date}
                                    className="h-10 w-32 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                />
                            )}
                        </div>
                    );
                }}
            />
            <FieldError id={errorId} message={error} />
        </div>
    );
};

export default DatePicker;
