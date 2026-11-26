/* ──────────────────────────────────────────────────────────────────────────
 * DataTable — a generic, reusable, CONTROLLED table component.
 *
 * "Controlled" means this component does NOT fetch or own the data. The
 * parent page (see src/pages/Supplier/Supplier.tsx) passes the rows in via
 * `data` plus the pagination/sort state, and DataTable simply RENDERS them.
 * Whenever the user changes page/sort/rows-per-page, DataTable calls an
 * onXChange callback and the parent re-fetches from the API (this is called
 * "server-side pagination / sorting" — we never slice the data here).
 *
 * Because it is generic, the parent must tell us the row TYPE via `<T>`
 * (e.g. <DataTable<Supplier>>) so that the accessors and cell renderers are
 * type-safe.
 * ────────────────────────────────────────────────────────────────────────── */
import { useState, useEffect, type ReactNode } from 'react';
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
} from 'lucide-react';
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableHeaderCell,
    TableCell,
    Button,
} from '@pikoloo/darwin-ui';
import Pagination from './Pagination';
import FormCheckbox from '../form/FormCheckbox';
import EmptyState, { type EmptyStateProps } from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import InitialsAvatar from '../ui/InitialsAvatar';
import ViewDetailsButton from '../Buttons/ViewDetailsButton';

/* A single column definition. The parent builds an array of these.
 *   - accessor: the field name on the row object that this column displays
 *               (e.g. 'company'). Must match a key of T.
 *   - header:   the label shown in the table header row.
 *   - sortable: if the header can be clicked to sort (default true).
 *   - allowedAction: set to false to HIDE this column entirely.
 *   - cell:     OPTIONAL custom renderer. Use it when a column needs more
 *               than plain text — e.g. the Actions column that renders
 *               Edit/Delete buttons.
 *   - hideOnMobile: leave this column out of the phone card view.
 *   - mobileTitle:  use this column as the card's title (default: the first
 *                   column that isn't `status` / `actions`).
 *
 * Card view on phones and tablets (below lg — 1 column, 2 on tablets), picked from the columns:
 *   title = mobileTitle column · badge (top right) = `status` ·
 *   label/value rows = everything else · buttons = `actions` (+ "View
 *   Details" when onRowClick is set).
 */
export interface DataColumn<T> {
    accessor: string;
    header: ReactNode;
    sortable?: boolean;
    allowedAction?: boolean;
    cell?: (row: T) => ReactNode;
    hideOnMobile?: boolean;
    mobileTitle?: boolean;
}

/* Props that the parent page must supply.
 *
 * NOTE the "controlled" pattern: `currentPage`, `totalPages`, `sortColumn`,
 * `columnDirection`, `totalRows` and `data` all come FROM the parent (usually
 * from a react-query hook). The `on*Change` callbacks push changes BACK to the
 * parent so it can update state and re-call the API.
 */
export interface DataTableProps<T> {
    columns: DataColumn<T>[]; // data columns
    data: T[]; // rows to display (already fetched by the parent)
    currentPage: number; // current table page
    totalPages: number; // total page count
    sortColumn: string | undefined; // sorting column
    columnDirection: 'asc' | 'desc' | undefined; // sorting direction
    isLoading?: boolean; // api fetch loading
    totalRows?: number; // overall total data
    itemsPerPage?: number; // how many rows per page
    onRowClick?: (row: T) => void; // fired when a row is clicked
    onPageChange?: (page: number) => void; // parent updates currentPage -> re-fetch
    onItemsPerPageChange?: (items: number) => void; // parent updates limit -> re-fetch
    onSortChange?: (key: string, direction: 'asc' | 'desc') => void; // parent re-fetches sorted
    emptyMessage?: string; // text shown when there are no rows
    selectable?: boolean; // enables the checkbox column + "Delete Selected"
    onDeleteSelected?: (ids: Array<number | string>) => void; // bubbles selected ids up to parent
    getRowId?: (row: T) => number | string; // how to get the row's unique id (defaults to row.id)

    // ── Polish (on by default; pass false to opt out) ──
    skeleton?: boolean; // shimmering placeholder rows/cards while loading, instead of "Loading..."
    emptyState?: EmptyStateProps; // icon + title + help + action, instead of emptyMessage
    cardAvatar?: (row: T) => string | null | undefined; // name for the initials square on each card
    interactive?: boolean; // cards lift / rows highlight on hover (default on)
}

function DataTable<T>({
    columns,
    data,
    currentPage,
    totalPages,
    sortColumn,
    columnDirection,
    isLoading = false,
    totalRows = 0,
    itemsPerPage = 10,
    onRowClick,
    onPageChange,
    onItemsPerPageChange,
    onSortChange,
    emptyMessage = 'No records found.',
    selectable = false,
    onDeleteSelected,
    getRowId,
    skeleton = true,
    emptyState,
    cardAvatar,
    interactive = true,
}: DataTableProps<T>) {
    // Local state for the checkbox selection. We only track the row IDs here;
    // the actual delete is handled by the parent via onDeleteSelected.
    const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);

    // Extracts the unique id of a row so checkboxes know which row they belong
    // to. Uses the optional getRowId prop, falling back to `row.id`.
    const resolveRowId = (row: T) =>
        getRowId
            ? getRowId(row)
            : ((row as Record<string, unknown>).id as number | string | undefined);

    // Clear all selection whenever the `data` array changes. Why? After the
    // parent deletes rows it re-fetches, so `data` is a brand-new array and the
    // old selected ids would be stale (pointing to rows that no longer exist).
    useEffect(() => {
        setSelectedIds([]);
    }, [data]);

    // Check / uncheck a single row.
    const toggleSelect = (id: number | string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    // The ids of every row currently on this page (used by "select all").
    const pageIds = data
        .map((row) => resolveRowId(row))
        .filter((id): id is number | string => id != null);

    // "Select all" is checked only when EVERY row on the current page is
    // selected. Note this only covers the current page, not all pages.
    const allPageSelected =
        pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    // Toggle "select all on this page". We merge with the existing selection so
    // already-checked rows from other pages are preserved.
    const toggleSelectAll = () => {
        if (allPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    // "Delete Selected (n)" was clicked -> hand the checked ids to the parent.
    // DataTable does NOT show any confirmation here; the parent opens its own
    // DeleteDialog (see Supplier.tsx) and performs the actual API call.
    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) return;
        onDeleteSelected?.(selectedIds);
    };

    // Clicking a sortable header toggles asc/desc and tells the parent to
    // re-fetch the API with the new sort column + direction.
    const handleHeaderClick = (accessor: string) => {
        if (!onSortChange) return;
        const nextDirection =
            sortColumn === accessor && columnDirection === 'asc' ? 'desc' : 'asc';
        onSortChange(accessor, nextDirection);
    };

    // Renders a cell: if the column defines a custom `cell` renderer use that,
    // otherwise just show the raw field value (falling back to '' when null).
    const renderCellValue = (row: T, column: DataColumn<T>) => {
        if (column.cell) return column.cell(row);
        const value = (row as Record<string, unknown>)[column.accessor];
        return value == null ? '' : String(value);
    };

    // Columns that are allowed to render (allowedAction !== false).
    const visibleColumns = columns.filter((column) => column.allowedAction !== false);

    // Total cell count of a row. Used for the Loading/empty placeholder row so
    // it stretches across every column. +1 when the checkbox column is shown.
    const colSpan = visibleColumns.length + (selectable ? 1 : 0);

    // Footer range text ("1–10 of 50"). When there are no rows we show "0".

    // ── Phone card view: which column plays which part of the card ──
    const actionsColumn = visibleColumns.find((c) => c.accessor === 'actions');
    const statusColumn = visibleColumns.find((c) => c.accessor === 'status');
    const mobileColumns = visibleColumns.filter(
        (c) => !c.hideOnMobile && c !== actionsColumn && c !== statusColumn,
    );
    const titleColumn = mobileColumns.find((c) => c.mobileTitle) ?? mobileColumns[0];
    const detailColumns = mobileColumns.filter((c) => c !== titleColumn);

    // Empty values read better as a dash in the card's label/value rows.
    const renderCardValue = (row: T, column: DataColumn<T>) => {
        const value = renderCellValue(row, column);
        return value === '' || value == null || value === false ? '—' : value;
    };

    const sortIcon = (column: DataColumn<T>) => {
        if (sortColumn !== column.accessor)
            return <ChevronsUpDown className="w-4 h-4 text-slate-400" />;
        return columnDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4 text-slate-600" />
        ) : (
            <ChevronDown className="w-4 h-4 text-slate-600" />
        );
    };

    return (
        <div className="space-y-2">
            {/* "Delete Selected" toolbar 
                 Only visible when selectable is on AND at least one row is
                 checked. Clicking it only fires onDeleteSelected(ids); the
                 parent is responsible for showing the confirm dialog. */}
            {selectable && selectedIds.length > 0 && (
                <div className="flex w-full items-center justify-end gap-3 px-1">
                    <span className="text-sm text-slate-500">
                        {selectedIds.length} selected
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                    >
                        Delete Selected ({selectedIds.length})
                    </Button>
                </div>
            )}

            {/* ── Phones (1 column) and tablets (2 columns): one card per row ── */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                {isLoading && skeleton ? (
                    Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                {cardAvatar && <Skeleton className="h-11 w-11 rounded-xl" />}
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                            <div className="mt-4 space-y-3">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
                        </div>
                    ))
                ) : !isLoading && data.length === 0 && emptyState ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white md:col-span-2">
                        <EmptyState {...emptyState} />
                    </div>
                ) : isLoading || data.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm md:col-span-2">
                        {isLoading ? 'Loading...' : emptyMessage}
                    </div>
                ) : (
                    data.map((row, index) => {
                        const rowId = resolveRowId(row);
                        const actions = actionsColumn ? renderCellValue(row, actionsColumn) : null;
                        return (
                            <div
                                key={rowId ?? index}
                                className={`flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${
                                    interactive
                                        ? 'transition duration-200 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md active:translate-y-0'
                                        : ''
                                }`}
                            >
                                {/* Title + status badge */}
                                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        {selectable && rowId != null && (
                                            <div className="pt-0.5">
                                                <FormCheckbox
                                                    name={`select-card-${rowId}`}
                                                    checked={selectedIds.includes(rowId)}
                                                    onChange={() => toggleSelect(rowId)}
                                                />
                                            </div>
                                        )}
                                        {cardAvatar && <InitialsAvatar name={cardAvatar(row)} />}
                                        {titleColumn && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-500">{titleColumn.header}</p>
                                                <div className="break-words text-base font-semibold text-slate-800">
                                                    {renderCardValue(row, titleColumn)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {statusColumn && (
                                        <div className="shrink-0">{renderCellValue(row, statusColumn)}</div>
                                    )}
                                </div>

                                {/* Label / value rows */}
                                {detailColumns.length > 0 && (
                                    <dl className="divide-y divide-gray-100 border-t border-gray-100">
                                        {detailColumns.map((column) => (
                                            <div
                                                key={column.accessor}
                                                className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
                                            >
                                                <dt className="shrink-0 text-slate-500">{column.header}</dt>
                                                <dd className="min-w-0 break-words text-right text-slate-800">
                                                    {renderCardValue(row, column)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}

                                {/* Buttons, full width like a mobile action row. Hidden
                                    when the row ends up with no buttons (e.g. the user
                                    lacks edit/delete rights, so the cell renders empty). */}
                                {(actions || onRowClick) && (
                                    <div className="mt-auto flex flex-col gap-2 border-t border-gray-100 px-4 py-3 [&:not(:has(button,a))]:hidden">
                                        {actions && (
                                            // No slot for a table-only button (ViewDetailsButton tableOnly),
                                            // which is hidden here.
                                            <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 [&_button]:w-full [&:not(:has(button:not(.hidden),a))]:hidden">
                                                {actions}
                                            </div>
                                        )}
                                        {onRowClick && (
                                            <ViewDetailsButton onClick={() => onRowClick(row)} />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Laptops and up: the table ── */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
                <Table>
                    <TableHead>
                        <TableRow>
                            {/* "Select all" checkbox for the current page. */}
                            {selectable && (
                                <TableHeaderCell className="w-10">
                                    <FormCheckbox
                                        name="select-all"
                                        checked={allPageSelected}
                                        onChange={toggleSelectAll}
                                    />
                                </TableHeaderCell>
                            )}

                            {visibleColumns.map((column) => {
                                // A column is clickable to sort only when the
                                // parent passed onSortChange AND the column did
                                // not explicitly opt out with sortable: false.
                                const sortable =
                                    onSortChange != null && column.sortable !== false;
                                return (
                                    <TableHeaderCell
                                        key={column.accessor}
                                        onClick={
                                            sortable
                                                ? () => handleHeaderClick(column.accessor)
                                                : undefined
                                        }
                                        className={
                                            sortable
                                                ? 'cursor-pointer select-none'
                                                : undefined
                                        }
                                    >
                                        <div className="flex items-center gap-1">
                                            {column.header}
                                            {sortable && sortIcon(column)}
                                        </div>
                                    </TableHeaderCell>
                                );
                            })}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Loading / empty placeholders stretch across all
                            columns via colSpan. */}
                        {isLoading && skeleton ? (
                            Array.from({ length: 5 }, (_, i) => (
                                <TableRow key={i}>
                                    {selectable && (
                                        <TableCell>
                                            <Skeleton className="h-4 w-4" />
                                        </TableCell>
                                    )}
                                    {visibleColumns.map((column, c) => (
                                        <TableCell key={column.accessor}>
                                            <Skeleton className={`h-4 ${c === 0 ? 'w-40' : 'w-24'}`} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={colSpan}
                                    className="text-center py-10 text-slate-400"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={colSpan}
                                    className="text-center py-10 text-slate-400"
                                >
                                    {emptyState ? <EmptyState {...emptyState} /> : emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, index) => {
                                const rowId = resolveRowId(row);
                                return (
                                    <tr
                                        key={rowId ?? index}
                                        onClick={
                                            onRowClick ? () => onRowClick(row) : undefined
                                        }
                                        className={
                                            onRowClick
                                                ? 'cursor-pointer hover:bg-slate-50 transition-colors'
                                                : interactive
                                                  ? 'hover:bg-blue-50/40 transition-colors'
                                                  : undefined
                                        }
                                    >
                                        {/* Per-row checkbox. stopPropagation is
                                            important: without it, clicking the
                                            checkbox would ALSO trigger the row's
                                            onClick (onRowClick). */}
                                        {selectable && rowId != null && (
                                            <TableCell
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <FormCheckbox
                                                    name={`select-row-${rowId}`}
                                                    checked={selectedIds.includes(rowId)}
                                                    onChange={() => toggleSelect(rowId)}
                                                />
                                            </TableCell>
                                        )}
                                        {visibleColumns.map((column) => (
                                            <TableCell key={column.accessor}>
                                                {renderCellValue(row, column)}
                                            </TableCell>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer: rows per page, "1–10 of 25" and the page numbers. */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRows={totalRows}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => onPageChange?.(page)}
                onItemsPerPageChange={(size) => onItemsPerPageChange?.(size)}
            />
        </div>
    );
}

export default DataTable;
