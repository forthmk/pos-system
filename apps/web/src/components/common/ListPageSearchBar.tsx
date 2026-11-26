/* ──────────────────────────────────────────────────────────────────────────
 * ListPageSearchBar — the search row used by every SearchField-based list
 * page, right above its DataTable. On desktop (≥1024px) it's just the
 * search box, at most 28rem wide like every list page's (toolbar.ts). Below that, the create
 * button (which ListPageTitle omits at this width) moves down to sit beside
 * it as an icon-only square.
 * ────────────────────────────────────────────────────────────────────────── */
import type { ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@pikoloo/darwin-ui';
import SearchField from '../form/SearchField';

interface ListPageSearchBarProps {
    search: string | undefined;
    onSearchChange: (value: string) => void;
    placeholder: string;
    icon: LucideIcon;
    actionLabel: string;
    canAct: boolean;
    onAction: () => void;
    /** Extra classes for the desktop-only search box, e.g. 'sm:w-72' —
     *  matches whatever width each page used before this was extracted. */
    desktopClassName?: string;
    /** Passed to SearchField: what to suggest as you type. */
    suggestions?: string[];
}

const ListPageSearchBar = ({
    search, onSearchChange, placeholder, icon: Icon, actionLabel, canAct, onAction, desktopClassName = '', suggestions,
}: ListPageSearchBarProps) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value);

    return (
        <>
            {/* SearchField's own `className` prop only reaches its inner
                <input> — the search icon is painted by a separate wrapper
                <div> that only `wrapperClassName` controls. Using `hidden`
                on `className` alone hides the text field but leaves the
                icon rendering, floating on top of the row below. */}
            <SearchField
                value={search}
                onChange={handleChange}
                placeholder={placeholder}
                suggestions={suggestions}
                wrapperClassName={`hidden lg:block mb-4 w-full max-w-md ${desktopClassName}`.trim()}
            />
            {/* Full width on a phone; from a tablet up it stops at 28rem like
                every other list page's search (toolbar.ts), the action pushed right. */}
            <div className="flex items-center justify-between gap-2 mb-4 lg:hidden">
                <SearchField
                    value={search}
                    onChange={handleChange}
                    placeholder={placeholder}
                    suggestions={suggestions}
                    wrapperClassName="min-w-0 flex-1 sm:max-w-md"
                />
                {canAct && (
                    <Button variant="primary" iconOnly onClick={onAction} title={actionLabel}>
                        <Icon className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </>
    );
};

export default ListPageSearchBar;
