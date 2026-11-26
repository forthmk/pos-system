import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { initialsOf } from '../ui/InitialsAvatar';
import LogoutButton from './LogoutButton';

// The POS navbar (UI reference: QUICKBITE · POS-01 … clock): brand pill with
// the terminal's code, the live clock, who is signed in, Log out (staff only —
// a paired kiosk / kitchen screen stays signed in).

const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', cashier: 'Cashier', chef: 'Chef' } as const;
const SCREEN_LABEL = { kiosk: 'Self-service kiosk', kds: 'Kitchen display' } as const;

const Clock = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(t);
    }, []);
    return (
        <span className="rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-sm font-bold tabular-nums text-slate-700">
            {now.toLocaleTimeString('en-GB', { hour12: false })}
        </span>
    );
};

const Header = () => {
    const navigate = useNavigate();
    const { principal } = useAuth();
    const terminal = principal?.kind === 'staff' ? principal.terminal?.code : principal?.code;
    const name = principal?.kind === 'staff' ? principal.name : principal?.name;
    const subtitle = principal?.kind === 'staff' ? ROLE_LABEL[principal.role] : principal ? SCREEN_LABEL[principal.type] : '';

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
                <button type="button" onClick={() => navigate('/home')} className="flex min-w-0 items-center gap-2" aria-label="QuickBite — home">
                    <span className="flex items-center gap-2 rounded-xl bg-slate-900 py-1.5 pl-3 pr-1.5 text-sm font-extrabold tracking-[0.15em] text-white">
                        <span className="text-orange-400">QUICKBITE</span>
                        {terminal && <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-orange-300">{terminal}</span>}
                    </span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                    <Clock />
                    <div className="hidden items-center gap-2.5 rounded-full bg-slate-50 py-1 pl-1 pr-4 ring-1 ring-slate-200/80 sm:flex">
                        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                            {initialsOf(name)}
                        </span>
                        <span className="min-w-0">
                            <span className="block max-w-[12rem] truncate text-sm font-semibold leading-tight text-slate-800">{name}</span>
                            <span className="block text-[11px] font-medium leading-tight text-orange-600">{subtitle}</span>
                        </span>
                    </div>
                    {principal?.kind === 'staff' && <LogoutButton />}
                </div>
            </div>
        </header>
    );
};

export default Header;
