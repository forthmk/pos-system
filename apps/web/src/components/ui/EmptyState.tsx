import type { ReactNode } from 'react';
import { SearchX } from 'lucide-react';

// Friendly "nothing here" block for lists: icon, title, a line of help and
// an optional action (e.g. [+ Create Supplier] or [Clear search]).
export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        {icon && (
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 [&_svg]:h-7 [&_svg]:w-7">
                {icon}
            </div>
        )}
        <p className="text-base font-semibold text-slate-800 dark:text-white">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export default EmptyState;

// The two empty states every list page needs: nothing matched the search
// (with a Clear search button), or there's nothing yet at all.
export const listEmptyState = ({
    search,
    onClearSearch,
    noun,
    icon,
    title,
    description,
    action,
}: {
    search?: string | null;
    onClearSearch?: () => void;
    noun: string; // plural, e.g. "products"
    icon: ReactNode;
    title?: string;
    description?: ReactNode;
    action?: ReactNode;
}): EmptyStateProps =>
    search?.trim()
        ? {
              icon: <SearchX />,
              title: `No ${noun} match your search`,
              description: <>Nothing found for “{search.trim()}”. Try a different word.</>,
              action: onClearSearch ? (
                  <button
                      type="button"
                      onClick={onClearSearch}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                      Clear search
                  </button>
              ) : undefined,
          }
        : { icon, title: title ?? `No ${noun} yet`, description, action };
