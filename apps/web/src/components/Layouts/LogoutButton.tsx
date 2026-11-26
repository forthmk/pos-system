import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ConfirmDialog from '../dialogs/ConfirmDialog';

// Log out: the door icon in its own circle, then the words — a red pill.
// Phones show the icon only. It asks first, so a stray tap doesn't end the
// session. Used at the right end of the navbar (Header), staff only.
const LogoutButton = () => {
   const navigate = useNavigate();
   const { logout } = useAuth();
   const [confirmLogout, setConfirmLogout] = useState(false);

   return (
      <>
         <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Log out"
            className="group flex shrink-0 items-center gap-2 rounded-full bg-rose-50 py-1 pl-1 pr-1 text-rose-600 ring-1 ring-rose-100 transition-colors hover:bg-rose-100 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:pr-4 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-900/50 dark:hover:bg-rose-950/50"
         >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 transition-colors group-hover:bg-rose-200 dark:bg-rose-900/40">
               <LogOut className="h-[18px] w-[18px]" />
            </span>
            <span className="hidden text-sm font-semibold sm:inline">Log out</span>
         </button>
         <ConfirmDialog
            open={confirmLogout}
            onClose={() => setConfirmLogout(false)}
            onConfirm={async () => {
               setConfirmLogout(false);
               logout();
               navigate('/login', { replace: true });
            }}
            title="Log out?"
            description="The next person signs in with their own username and PIN."
            confirmLabel="Log out"
            tone="danger"
         />
      </>
   );
};

export default LogoutButton;
