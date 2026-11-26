import { EyeOff } from 'lucide-react';
import EmptyState from './EmptyState';

// Shown in place of a page's records (cards, filters and list) when the
// user's position has the module but not its View permission — the page's
// Add button stays, so they can still log a new record.
// `className` adds to the box's classes (it is full width by default, like
// the centred page bodies it sits in).
const NoViewAccess = ({ canAdd = false, className = '' }: { canAdd?: boolean; className?: string }) => (
    <div className={`rounded-2xl border border-dashed border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 ${className}`}>
        <EmptyState
            icon={<EyeOff />}
            title="You can't view these records"
            description={
                canAdd
                    ? 'You can still add a new one with the button above. To see the list, ask an admin to turn on View for your position.'
                    : 'Ask an admin to turn on View for your position.'
            }
        />
    </div>
);

export default NoViewAccess;
