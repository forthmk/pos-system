/* ──────────────────────────────────────────────────────────────────────────
 * ListPageTitle — the title/subtitle heading used at the top of every list
 * page. On desktop (≥1024px) the create button sits beside the title in
 * this same block; below that width the button moves down to sit next to
 * the search bar instead (see ListPageSearchBar), so this only renders the
 * title/subtitle there.
 * ────────────────────────────────────────────────────────────────────────── */
import type { LucideIcon } from 'lucide-react';
import { Button } from '@pikoloo/darwin-ui';

interface ListPageTitleProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    actionLabel: string;
    canAct: boolean;
    onAction: () => void;
}

const ListPageTitle = ({
    title, subtitle, icon: Icon, actionLabel, canAct, onAction,
}: ListPageTitleProps) => (
    <>
        <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            </div>
            {canAct && (
                <Button variant="primary" leftIcon={<Icon className="w-4 h-4 mr-1" />} onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
        <div className="lg:hidden">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
    </>
);

export default ListPageTitle;
