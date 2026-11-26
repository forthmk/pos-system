import type { Method, Ticket } from '../ticket';

// UI reference: the two rows along the bottom —
//   IN · OUT · PWD · Voucher · Student · Senior
//   GCash · Cash · Card · CLEAR · PROCEED · Kiosk #748

type DiscountCode = 'PWD' | 'VOUCHER' | 'STUDENT' | 'SENIOR';

interface Props {
    ticket: Ticket;
    canProceed: boolean;
    proceeding: boolean;
    latestKiosk: string | null;
    waiting: number;
    onMode: (m: 'IN' | 'OUT') => void;
    onDiscount: (d: DiscountCode) => void;
    onMethod: (m: Method) => void;
    onClear: () => void;
    onProceed: () => void;
    onKiosk: () => void;
}

const cell = 'flex h-14 items-center justify-center text-base font-extrabold transition disabled:opacity-40 sm:h-16 sm:text-lg';

const ActionBar = ({ ticket, canProceed, proceeding, latestKiosk, waiting, onMode, onDiscount, onMethod, onClear, onProceed, onKiosk }: Props) => {
    const on = (yes: boolean, color: string) => (yes ? `${color} text-white` : 'bg-white text-slate-700 hover:bg-slate-50');
    const discountOn = (code: DiscountCode) => ticket.discount?.type === code;
    return (
        <div className="grid grid-cols-3 overflow-hidden rounded-3xl ring-1 ring-slate-200 sm:grid-cols-6 [&>*]:border-b [&>*]:border-r [&>*]:border-slate-200">
            <button type="button" className={`${cell} ${on(ticket.mode === 'IN', 'bg-orange-500')}`} onClick={() => onMode('IN')}>
                IN
            </button>
            <button type="button" className={`${cell} ${on(ticket.mode === 'OUT', 'bg-emerald-600')}`} onClick={() => onMode('OUT')}>
                OUT
            </button>
            {(['PWD', 'VOUCHER', 'STUDENT', 'SENIOR'] as const).map((d) => (
                <button key={d} type="button" className={`${cell} ${on(discountOn(d), 'bg-amber-500')}`} onClick={() => onDiscount(d)}>
                    {d === 'VOUCHER' ? 'Voucher' : d === 'STUDENT' ? 'Student' : d === 'SENIOR' ? 'Senior' : 'PWD'}
                </button>
            ))}
            {(['gcash', 'cash', 'card'] as const).map((m) => (
                <button key={m} type="button" className={`${cell} ${on(ticket.method === m, m === 'gcash' ? 'bg-sky-600' : m === 'cash' ? 'bg-emerald-600' : 'bg-slate-700')}`} onClick={() => onMethod(m)}>
                    {m === 'gcash' ? 'GCash' : m === 'cash' ? 'Cash' : 'Card'}
                </button>
            ))}
            <button type="button" className={`${cell} bg-rose-600 text-white hover:bg-rose-700`} onClick={onClear}>
                CLEAR
            </button>
            <button type="button" className={`${cell} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={onProceed} disabled={!canProceed || proceeding}>
                {proceeding ? 'Saving…' : 'PROCEED'}
            </button>
            <button type="button" className={`${cell} relative bg-slate-900 text-amber-400 hover:bg-slate-800`} onClick={onKiosk}>
                Kiosk {latestKiosk ? `#${Number(latestKiosk)}` : '#'}
                {waiting > 0 && <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 text-xs font-bold text-slate-900">{waiting}</span>}
            </button>
        </div>
    );
};

export default ActionBar;
