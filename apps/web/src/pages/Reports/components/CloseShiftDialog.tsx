import { useEffect, useState } from 'react';
import { CircleCheck, Printer } from 'lucide-react';
import type { ShiftReport } from '@shared/model';
import Modal from '../../../components/modals/Modal';
import { money, zLabel } from '../format';

/* ──────────────────────────────────────────────────────────────────────────
 * Close Shift (design §5.7): the cashier counts the drawer and types the
 * amount; the screen shows expected cash and over / short before saving.
 * Saving closes the shift and stores its numbered Z-reading (never changed),
 * then offers to print it (only on tap — the browser's print window would
 * otherwise pause the screen until someone closes it). Settle or cancel unpaid kiosk orders first.
 * ────────────────────────────────────────────────────────────────────────── */

const field = 'w-full rounded-xl bg-white px-4 py-3 text-lg ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-400';

interface Props {
    report: ShiftReport | null;
    busy: boolean;
    error: string;
    /** The Z-reading once saved (shows the done step). */
    closed: ShiftReport | null;
    onClose: () => void;
    onConfirm: (counted: number) => void;
    onPrint: (r: ShiftReport) => void;
}

const CloseShiftDialog = ({ report, busy, error, closed, onClose, onConfirm, onPrint }: Props) => {
    const [counted, setCounted] = useState('');
    useEffect(() => setCounted(''), [report?.shift.id]);
    const open = !!report || !!closed;
    const amount = counted === '' ? null : Number(counted);
    const diff = report && amount !== null && !Number.isNaN(amount) ? Math.round((amount - report.cash.expected) * 100) / 100 : null;

    if (closed) {
        const os = closed.cash.over_short ?? 0;
        return (
            <Modal isOpen={open} onClose={onClose} title="Shift closed">
                <div className="space-y-4 text-center">
                    <CircleCheck className="mx-auto h-14 w-14 text-emerald-600" />
                    <p className="text-xl font-extrabold text-slate-900">
                        {closed.z_reading ? zLabel(closed.z_reading.z_number) : 'Z-reading'} saved · {closed.shift.terminal_code}
                    </p>
                    <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-left ring-1 ring-slate-200">
                        <p className="flex justify-between">
                            <span>Gross shift sales</span>
                            <b className="font-mono">{money(closed.gross_sales)}</b>
                        </p>
                        <p className="flex justify-between">
                            <span>Expected / counted cash</span>
                            <b className="font-mono">
                                {money(closed.cash.expected)} / {money(closed.cash.counted ?? 0)}
                            </b>
                        </p>
                        <p className={`flex justify-between font-bold ${os === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            <span>{os === 0 ? 'Balanced' : os > 0 ? 'Over' : 'Short'}</span>
                            <span className="font-mono">{money(os)}</span>
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => onPrint(closed)} className="flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-slate-700 ring-1 ring-slate-300">
                            <Printer className="h-5 w-5" /> Print Z-reading
                        </button>
                        <button type="button" onClick={onClose} className="rounded-xl bg-slate-900 py-3 font-bold text-white">
                            Done
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={open} onClose={busy ? () => undefined : onClose} title={`Close shift on ${report?.shift.terminal_code ?? ''}`}>
            {report && (
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (amount !== null && !Number.isNaN(amount)) onConfirm(amount);
                    }}
                >
                    <p className="text-slate-600">Settle or cancel any unpaid kiosk orders first. Then count the cash in the drawer and type the total.</p>
                    <div className="space-y-1 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="flex justify-between text-slate-600">
                            <span>Starting cash + cash sales − refunds</span>
                        </p>
                        <p className="flex justify-between text-lg font-bold text-slate-900">
                            <span>Expected in drawer</span>
                            <span className="font-mono">{money(report.cash.expected)}</span>
                        </p>
                    </div>
                    <label className="block font-bold text-slate-700">
                        Counted cash (₱)
                        <input
                            autoFocus
                            value={counted}
                            onChange={(e) => setCounted(e.target.value.replace(/[^\d.]/g, ''))}
                            inputMode="decimal"
                            placeholder="0.00"
                            className={`${field} mt-1 font-mono`}
                        />
                    </label>
                    {diff !== null && (
                        <p className={`flex justify-between rounded-xl px-4 py-2.5 font-bold ${diff === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            <span>{diff === 0 ? 'Balanced' : diff > 0 ? 'Over' : 'Short'}</span>
                            <span className="font-mono">{money(diff)}</span>
                        </p>
                    )}
                    {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                    <button type="submit" disabled={busy || counted === ''} className="w-full rounded-xl bg-rose-600 py-3.5 text-lg font-bold text-white disabled:opacity-50">
                        {busy ? 'Closing…' : 'Close shift & save Z-reading'}
                    </button>
                </form>
            )}
        </Modal>
    );
};

export default CloseShiftDialog;
