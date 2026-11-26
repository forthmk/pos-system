import type { MouseEvent } from 'react';
import { Eye } from 'lucide-react';

interface ViewDetailsButtonProps {
   onClick: (e: MouseEvent<HTMLButtonElement>) => void;
   // 'sm' — for a table's Actions column: compact in the laptop table row,
   // and the full card button below laptop width, where DataTable shows the
   // same cell as a card's button row. 'md' — always the card button.
   // 'compact' — a fixed-size button at the end of a BoxList row.
   size?: 'sm' | 'md' | 'compact';
   // Laptop table only, hidden on cards: for pages whose rows also open on
   // click, where DataTable's card already ends in its own View Details.
   // A prop rather than a `hidden` className, which loses to inline-flex.
   tableOnly?: boolean;
   /** For a narrow column on a phone: reads "Details" there (screen readers
    *  still hear "View Details"); the full label from sm up. */
   shortOnPhone?: boolean;
   /** Just the eye icon: the "View Details" words are hidden (kept for
    *  screen readers, and shown as a tooltip on hover). */
   iconOnly?: boolean;
   className?: string;
}

// The one "View Details" button: white with a blue outline and an eye icon.
// Used on DataTable cards, in table rows and anywhere a record is opened to
// be looked at rather than changed.
const ViewDetailsButton = ({ onClick, size = 'md', tableOnly = false, shortOnPhone = false, iconOnly = false, className = '' }: ViewDetailsButtonProps) => (
   <button
      type="button"
      onClick={onClick}
      title={iconOnly ? 'View Details' : undefined}
      className={`${tableOnly ? 'hidden lg:inline-flex' : 'inline-flex'} items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-blue-200 bg-white font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:bg-transparent dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 ${
         size === 'sm'
            ? 'w-full py-2.5 text-sm lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs'
            : size === 'compact'
              ? `${iconOnly ? 'px-3' : shortOnPhone ? 'px-2 sm:px-4' : 'px-4'} py-2 text-sm`
              : 'w-full py-2.5 text-sm'
      } ${className}`}
   >
      <Eye className={`shrink-0 ${size === 'sm' ? 'w-4 h-4 lg:w-3.5 lg:h-3.5' : 'w-4 h-4'}`} />
      {iconOnly ? (
         <span className="sr-only">View Details</span>
      ) : shortOnPhone ? (
         <span>
            <span className="max-sm:sr-only">View </span>Details
         </span>
      ) : (
         'View Details'
      )}
   </button>
);

export default ViewDetailsButton;
