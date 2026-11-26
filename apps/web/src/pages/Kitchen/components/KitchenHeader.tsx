import { Link } from 'react-router-dom';
import { Hamburger, House, Plus, WifiOff } from 'lucide-react';
import type { KdsStats } from '@shared/model';
import { ms } from '../time';

/* ──────────────────────────────────────────────────────────────────────────
 * Top of the kitchen display (UI reference "Kitchen Display"): QUICKBITE KDS,
 * the station + live status, Pending / Completed / Avg Prep, the clock, and
 * the dark Workflow strip with the colour legend.
 *
 * "+ New Kiosk Order" is a demo button from the mock-up — kept but hidden on
 * live stores (design decision 10: hide flag, code kept).
 * ────────────────────────────────────────────────────────────────────────── */

const SHOW_DEMO_ORDER_BUTTON = false;

interface Props {
    stationName: string;
    online: boolean;
    stats: KdsStats | undefined;
    now: number;
    delayMinutes: number;
    /** Staff (chef / manager) get a way back to Home; a paired KDS screen doesn't need one. */
    showHome: boolean;
}

const KitchenHeader = ({ stationName, online, stats, now, delayMinutes, showHome }: Props) => (
    <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-lg font-extrabold tracking-wide text-white">
                <Hamburger className="h-5 w-5 text-amber-400" /> QUICKBITE KDS
            </span>
            <span
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-bold tracking-wide ring-1 ${
                    online ? 'bg-slate-50 text-slate-600 ring-slate-200' : 'bg-red-50 text-red-700 ring-red-200'
                }`}
                role="status"
            >
                {online ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> : <WifiOff className="h-4 w-4" />}
                {stationName.toUpperCase()} • {online ? 'LIVE KIOSK FEED' : 'OFFLINE — RECONNECTING'}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-amber-50 px-4 py-2.5 text-base font-extrabold tracking-wide text-amber-700 ring-1 ring-amber-200">
                    PENDING <span className="ml-2 text-xl">{stats?.pending ?? '–'}</span>
                </span>
                <span className="rounded-lg bg-emerald-50 px-4 py-2.5 text-base font-extrabold tracking-wide text-green-800 ring-1 ring-emerald-200">
                    COMPLETED <span className="ml-2 text-xl">{stats?.completed ?? '–'}</span>
                </span>
                <span className="rounded-lg bg-slate-50 px-4 py-2.5 text-base font-extrabold tracking-wide text-slate-500 ring-1 ring-slate-200">
                    AVG PREP <span className="ml-2 font-mono text-xl text-slate-900">{stats?.avg_prep_seconds != null ? ms(stats.avg_prep_seconds) : '--:--'}</span>
                </span>
            </div>
        </div>
        <div className="flex items-center gap-3 px-4 pb-3 sm:px-6">
            <button
                type="button"
                className={`${SHOW_DEMO_ORDER_BUTTON ? 'flex' : 'hidden'} items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-base font-extrabold text-white`}
            >
                <Plus className="h-5 w-5" /> New Kiosk Order
            </button>
            <span className="rounded-lg bg-slate-50 px-4 py-2 font-mono text-xl font-bold text-slate-800 ring-1 ring-slate-200">
                {new Date(now).toLocaleTimeString('en-GB', { hour12: false })}
            </span>
            {showHome && (
                <Link to="/home" className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
                    <House className="h-4 w-4" /> Home
                </Link>
            )}
        </div>
        <div className="space-y-2 bg-slate-800 px-4 py-3 text-white sm:px-6">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
                <span className="rounded-md bg-slate-700 px-3 py-1 text-sm font-extrabold tracking-wider text-amber-400">WORKFLOW</span>
                <span>
                    Drag any <b>Pending Order</b> ticket into <b className="text-emerald-400">Completed Orders</b> (or tap the green checkmark badge) to bump &amp; serve.
                </span>
            </p>
            <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium">
                <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 bg-amber-500" /> Pending Prep
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 bg-red-600" /> Priority / Delay (&gt;{delayMinutes}m)
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 bg-green-600" /> Completed
                </span>
            </p>
        </div>
    </header>
);

export default KitchenHeader;
