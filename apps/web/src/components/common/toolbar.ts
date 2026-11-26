/* The toolbar above a BoxList page's rows — search, a filter dropdown, the
 * date field — laid out the same on every page:
 *
 *   phone   — search and filter on the first row, the date field across the
 *             whole second row
 *   tablet  — all on one row: search grows, filter and date keep a compact
 *   & laptop  size (a little wider on a laptop)
 *
 * The search grows to fill the row but stops at 28rem (max-w-md), so it is
 * the same size on every page rather than a long bar where the row has
 * little else on it. A page without a filter or a date simply leaves that
 * piece out; a page's own button (Add Category…) goes last with `ml-auto`. */

export const TOOLBAR = 'mb-4 flex flex-wrap items-center gap-2.5 md:flex-nowrap';

/** SearchField's `wrapperClassName`. */
export const TOOLBAR_SEARCH = 'w-1/2 shrink-0 sm:w-auto sm:min-w-0 sm:max-w-md sm:flex-1 sm:shrink';

/** The filter Select's `className`. */
export const TOOLBAR_SELECT =
    'h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-48 sm:flex-none md:w-40 lg:w-44 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

/** The wrapper around the date field. */
export const TOOLBAR_DATES = 'flex w-full items-center gap-2.5 sm:gap-3 md:w-auto md:shrink-0';

/** SearchField's `wrapperClassName` on a toolbar with no filter dropdown
 *  (the search takes the whole first row on a phone). */
export const TOOLBAR_SEARCH_ALONE = 'w-full sm:w-auto sm:min-w-0 sm:max-w-md sm:flex-1';
