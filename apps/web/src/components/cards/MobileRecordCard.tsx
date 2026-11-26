/* ──────────────────────────────────────────────────────────────────────────
 * MobileRecordCard — one record as a phone card, the same look DataTable
 * uses below md: small label + title, a badge top right, label/value rows,
 * and full-width action buttons at the bottom.
 *
 * For pages that render their own <table> instead of DataTable (Stores,
 * Store Requests, API Keys): they show a list of these below md and keep
 * their table from md up.
 * ────────────────────────────────────────────────────────────────────────── */
import type { ReactNode } from 'react';

interface MobileRecordCardProps {
    label?: ReactNode; // small caption above the title, e.g. "Reference"
    title: ReactNode;
    badge?: ReactNode; // e.g. a status pill, top right
    rows?: { label: ReactNode; value: ReactNode }[];
    actions?: ReactNode; // buttons; stretched full width
}

const MobileRecordCard = ({ label, title, badge, rows = [], actions }: MobileRecordCardProps) => (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
            <div className="min-w-0">
                {label && <p className="text-xs text-slate-500">{label}</p>}
                <div className="break-words text-base font-semibold text-slate-800 dark:text-white">
                    {title}
                </div>
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
        </div>

        {rows.length > 0 && (
            <dl className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-slate-700 dark:border-slate-700">
                {rows.map((row, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                        <dt className="shrink-0 text-slate-500">{row.label}</dt>
                        <dd className="min-w-0 break-words text-right text-slate-800 dark:text-slate-200">
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
        )}

        {/* Hidden when the user may not do anything here (no buttons render). */}
        {actions && (
            <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3 dark:border-slate-700 [&:not(:has(button,a))]:hidden [&>*]:flex-1 [&_button]:w-full">
                {actions}
            </div>
        )}
    </div>
);

// Loading / empty state in the same card style.
export const MobileListMessage = ({ children }: { children: ReactNode }) => (
    <div className="rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm md:col-span-2 dark:border-slate-700 dark:bg-slate-800">
        {children}
    </div>
);

export default MobileRecordCard;
