/* ──────────────────────────────────────────────────────────────────────────
 * Pagination — the footer under every list (BoxList, DataTable): "1–20 of
 * 45" and the pager. Every list shows 20 rows a page; the rows-per-page
 * picker is hidden (SHOW_PAGE_SIZE_PICKER) but kept:
 *
 *     ‹  1  [2]  3  …  8  ›
 *
 * A <nav aria-label="pagination"> holding Previous / Next at the ends and
 * the page numbers between, the current one filled and aria-current="page".
 * The first and last pages always show, with the pages either side of the
 * current one; a gap of more than one page collapses to an ellipsis.
 *
 * Pages are 1-based here and in every page's state; the API takes the same
 * 1-based `page` and turns it into an offset server-side, so nothing in the
 * web app converts. If the total shrinks under the current page (a filter,
 * a delete, a bigger page size), the page is pulled back to the last one.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FormSelect from '../form/FormSelect';

/** Every list shows this many rows a page. */
export const DEFAULT_PAGE_SIZE = 20;
// The rows-per-page picker is hidden for now — flip to bring it back.
const SHOW_PAGE_SIZE_PICKER = false;
export const PAGE_SIZES = [DEFAULT_PAGE_SIZE];

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/** 1 … 4 5 6 … 12 — first, last, and one page either side of the current. */
export const pageItems = (current: number, total: number): PageItem[] => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    const items: PageItem[] = [1];
    // A gap of exactly one page shows that page rather than an ellipsis.
    if (start === 3) items.push(2);
    else if (start > 3) items.push('ellipsis-start');
    for (let p = start; p <= end; p++) items.push(p);
    if (end === total - 2) items.push(total - 1);
    else if (end < total - 2) items.push('ellipsis-end');
    items.push(total);
    return items;
};

const CELL =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50';

interface PagerProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pager = ({ currentPage, totalPages, onPageChange }: PagerProps) => {
    const total = Math.max(1, totalPages);
    const go = (page: number) => onPageChange(Math.min(total, Math.max(1, page)));
    return (
        <nav aria-label="pagination">
            <ul className="flex items-center gap-1">
                <li>
                    <button
                        type="button"
                        aria-label="Previous page"
                        onClick={() => go(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className={`${CELL} text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white`}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                </li>
                {pageItems(currentPage, total).map((item) =>
                    typeof item === 'number' ? (
                        <li key={item}>
                            <button
                                type="button"
                                aria-label={`Page ${item}`}
                                aria-current={item === currentPage ? 'page' : undefined}
                                onClick={() => go(item)}
                                className={`${CELL} ${
                                    item === currentPage
                                        ? 'bg-blue-500 text-white shadow-sm hover:bg-blue-600'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                                }`}
                            >
                                {item}
                            </button>
                        </li>
                    ) : (
                        <li key={item} aria-hidden="true" className={`${CELL} pointer-events-none text-slate-400`}>
                            …
                        </li>
                    ),
                )}
                <li>
                    <button
                        type="button"
                        aria-label="Next page"
                        onClick={() => go(currentPage + 1)}
                        disabled={currentPage >= total}
                        className={`${CELL} text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white`}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </li>
            </ul>
        </nav>
    );
};

interface PaginationProps extends PagerProps {
    totalRows: number;
    itemsPerPage: number;
    onItemsPerPageChange: (size: number) => void;
}

/** The whole list footer: rows per page, "from–to of total", the pager. */
const Pagination = ({ currentPage, totalPages, totalRows, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) => {
    // Fewer pages than the page we're on (filtered down, rows deleted, a
    // bigger page size) — move back to the last page that exists.
    useEffect(() => {
        if (totalPages >= 1 && currentPage > totalPages) onPageChange(totalPages);
    }, [currentPage, totalPages, onPageChange]);

    const from = totalRows === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const to = Math.min(currentPage * itemsPerPage, totalRows);

    return (
        <div
            className={`flex flex-col gap-3 px-1 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:px-2 ${
                SHOW_PAGE_SIZE_PICKER ? 'sm:justify-between' : 'sm:justify-end'
            }`}
        >
            <div className={`flex items-center gap-2 text-sm text-slate-500 ${SHOW_PAGE_SIZE_PICKER ? '' : 'hidden'}`}>
                <span>Rows per page:</span>
                <FormSelect
                    name="rowsPerPage"
                    label=""
                    options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                    value={String(itemsPerPage)}
                    onChange={(e) => {
                        // A new page size starts again at page 1, which always exists.
                        onItemsPerPageChange(Number(e.target.value));
                        onPageChange(1);
                    }}
                />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:justify-start">
                <span className="text-sm text-slate-500">
                    {from}–{to} of {totalRows}
                </span>
                <Pager currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
        </div>
    );
};

export default Pagination;
