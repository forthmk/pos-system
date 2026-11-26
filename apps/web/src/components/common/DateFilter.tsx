/* ──────────────────────────────────────────────────────────────────────────
 * DateFilter — the calendar filters on the list pages, and the helpers that
 * turn their value into what each list's API filter takes.
 *
 *   DateRangeFilter  every list page — Purchase Orders, Store Requests,
 *                    Production, Wastage, Storage, Inventory: pick a day or
 *                    a from–to range; empty = all dates.
 *
 * Inventory reads its range two ways: the stock figures are as of the
 * range's last day (rangeEnd, today when empty), and the list keeps only
 * items that moved in the range (movedFilter).
 *
 * Values are civil dates ('yyyy-mm-dd', see DatePicker). Day boundaries are
 * this device's local midnight, sent to the API as ISO date-times, so
 * "Oct 8" means Oct 8 in the Philippines rather than in UTC.
 * ────────────────────────────────────────────────────────────────────────── */
import { DateRangePicker, type CivilRange } from '../form/DatePicker';
import { fromDateOnly, todayDateOnly } from '../../utils/dateOnly';

export type { CivilRange };

const nextDay = (value: string) => {
    const day = fromDateOnly(value)!;
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
};

const dayLabel = (value: string, month: 'short' | 'long' = 'short') =>
    fromDateOnly(value)!.toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' });

/** [date_from, date_to) for list filters — {} for all dates. A lone start
 *  day means just that day. */
export const rangeFilter = (range: CivilRange) =>
    range.from
        ? {
              date_from: fromDateOnly(range.from)!.toISOString(),
              date_to: nextDay(range.to ?? range.from).toISOString(),
          }
        : {};

/** "All dates", "Oct 8, 2026" or "Oct 1 – Oct 8, 2026". */
export const rangeLabel = (range: CivilRange) => {
    if (!range.from) return 'All dates';
    if (!range.to || range.to === range.from) return dayLabel(range.from);
    const from = fromDateOnly(range.from)!;
    const to = fromDateOnly(range.to)!;
    const sameYear = from.getFullYear() === to.getFullYear();
    return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })} – ${dayLabel(range.to)}`;
};

export const DateRangeFilter = ({ value, onChange }: { value: CivilRange; onChange: (value: CivilRange) => void }) => (
    <DateRangePicker
        value={value}
        onChange={onChange}
        placeholder="All dates"
        max={todayDateOnly()}
        className="w-full min-w-0 shrink-0 md:w-52 lg:w-64"
    />
);

/** The moment the day ended, for "stock as of" filters — undefined for today. */
export const dayEndAsOf = (value: string) =>
    value && value < todayDateOnly() ? nextDay(value).toISOString() : undefined;

/** "Oct 26, 2026" (or "October 26, 2026"). */
export const asOfLabel = (value: string, month: 'short' | 'long' = 'short') => dayLabel(value || todayDateOnly(), month);

/** The as-of day's month up to that day — the item history's range. */
export const monthToDay = (value: string): CivilRange => {
    const day = value || todayDateOnly();
    return { from: `${day.slice(0, 7)}-01`, to: day };
};

/** Inventory: the day the stock is shown as of — the range's last day,
 *  or today with no range. */
export const rangeEnd = (range: CivilRange) => range.to ?? range.from ?? todayDateOnly();

/** Inventory: only items with a stock movement in the range — {} for all. */
export const movedFilter = (range: CivilRange) => {
    const days = rangeFilter(range);
    return 'date_from' in days ? { moved_from: days.date_from, moved_to: days.date_to } : {};
};
