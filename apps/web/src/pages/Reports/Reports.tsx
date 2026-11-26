import { useEffect, useState } from 'react';
import { Download, LockKeyhole, Printer } from 'lucide-react';
import type { AuditRow, ShiftReport } from '@shared/model';
import RegisterTabs from '../../components/pos/RegisterTabs';
import { LoadingState } from '../../components/ui/Progress';
import { useCloseShift, useExportShiftCsv, useShiftReport, useShifts, useVoidOrder } from '../../hooks/api/usePos';
import { useAuth } from '../../hooks/useAuth';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { usePermission } from '../../hooks/usePermission';
import { friendlyError } from '../../utils/friendlyError';
import { printZReading } from '../../utils/printZReading';
import AuditLog from './components/AuditLog';
import CashPanel from './components/CashPanel';
import CloseShiftDialog from './components/CloseShiftDialog';
import StatCards from './components/StatCards';
import TenderBars from './components/TenderBars';
import VoidDialog from './components/VoidDialog';
import { time, zLabel } from './format';

/* ──────────────────────────────────────────────────────────────────────────
 * Sales Analytics & Shift Z-Reading Reports (design §5.7, §7.9, UI reference
 * "Shift Sales & Z-Reading Report"). Opens on this register's open shift (or
 * the latest one); the picker shows past shifts and their Z-readings.
 * Figures refresh live as orders are paid or voided.
 *
 *   Close Shift          cashier (own shift) / manager → Z-reading
 *   Void                 from the audit log, a manager's username + PIN
 *   Export CSV / Z-Read  managers
 *   Print X / Z-reading  58 mm, only when tapped (the browser's print window
 *                        pauses the screen until it is closed)
 * ────────────────────────────────────────────────────────────────────────── */

const download = (filename: string, text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const print = (r: ShiftReport) => void printZReading(r).catch(() => undefined);

const Reports = () => {
    const { principal } = useAuth();
    const { can } = usePermission();
    useLiveFeed();
    const shifts = useShifts();
    const [picked, setPicked] = useState<number | null>(null);
    const myTerminal = principal?.kind === 'staff' ? principal.terminal?.code : undefined;
    const fallback = shifts.data?.find((s) => s.status === 'open' && s.terminal_code === myTerminal) ?? shifts.data?.[0];
    const shiftId = picked ?? fallback?.id ?? null;
    const report = useShiftReport(shiftId);
    const closeShift = useCloseShift();
    const voidOrder = useVoidOrder();
    const exportCsv = useExportShiftCsv();

    const [closing, setClosing] = useState<ShiftReport | null>(null);
    const [closed, setClosed] = useState<ShiftReport | null>(null);
    const [closeError, setCloseError] = useState('');
    const [voiding, setVoiding] = useState<AuditRow | null>(null);
    const [voidError, setVoidError] = useState('');
    const [error, setError] = useState('');
    useEffect(() => setError(''), [shiftId]);

    if (shifts.isLoading || (shiftId !== null && report.isLoading)) return <LoadingState fullPage label="Loading the report…" />;
    const r = report.data;
    const open = r?.shift.status === 'open';

    const confirmClose = (counted: number) => {
        if (!closing) return;
        setCloseError('');
        closeShift.mutate(
            { shiftId: closing.shift.id, body: { counted_cash: counted } },
            {
                onSuccess: (z) => {
                    setClosing(null);
                    setClosed(z);
                },
                onError: (e) => setCloseError(friendlyError(e, 'Could not close the shift.')),
            },
        );
    };

    const confirmVoid = (body: { manager_username: string; manager_pin: string; reason: string }) => {
        if (!voiding) return;
        setVoidError('');
        voidOrder.mutate(
            { orderId: voiding.order_id, body },
            {
                onSuccess: () => setVoiding(null),
                onError: (e) => setVoidError(friendlyError(e, 'Could not void the order.')),
            },
        );
    };

    return (
        <div className="mx-auto max-w-[1400px] space-y-5 p-3 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-extrabold text-slate-900">Sales Analytics &amp; Shift Z-Reading Reports</p>
                <RegisterTabs />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Shift Sales &amp; Z-Reading Report</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Real-time POS &amp; Kiosk consolidated ledger{r ? ` • Terminal ${r.shift.terminal_code} • ${r.shift.cashier_name}` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {!!shifts.data?.length && (
                        <select
                            aria-label="Shift"
                            value={shiftId ?? ''}
                            onChange={(e) => setPicked(Number(e.target.value))}
                            className="rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-400"
                        >
                            {shifts.data.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.status === 'open' ? 'Open now' : s.z_number ? zLabel(s.z_number) : 'Closed'} · {s.terminal_code} ·{' '}
                                    {new Date(s.opened_at).toLocaleDateString('en-PH', { day: '2-digit', month: 'short' })} {time(s.opened_at)} · {s.cashier_name}
                                </option>
                            ))}
                        </select>
                    )}
                    {r && (
                        <button
                            type="button"
                            onClick={() => print(r)}
                            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <Printer className="h-4 w-4" /> Print {r.z_reading ? 'Z' : 'X'}-reading
                        </button>
                    )}
                    {r && open && can('shifts.use') && (
                        <button
                            type="button"
                            onClick={() => {
                                setCloseError('');
                                setClosing(r);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                        >
                            <LockKeyhole className="h-4 w-4" /> Close Shift
                        </button>
                    )}
                    {r && can('reports.export') && (
                        <button
                            type="button"
                            disabled={exportCsv.isPending}
                            onClick={() => {
                                setError('');
                                exportCsv.mutate(r.shift.id, {
                                    onSuccess: ({ filename, csv }) => download(filename, csv),
                                    onError: (e) => setError(friendlyError(e, 'Could not export the report.')),
                                });
                            }}
                            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            <Download className="h-4 w-4" /> Export CSV / Z-Read
                        </button>
                    )}
                </div>
            </div>

            {(error || report.isError) && (
                <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                    {error || friendlyError(report.error, 'Could not load the report.')}
                </p>
            )}

            {!r ? (
                <p className="rounded-2xl bg-white p-10 text-center font-medium text-slate-500 ring-1 ring-slate-200">No shifts yet. Open a shift on the register to start selling.</p>
            ) : (
                <>
                    <StatCards report={r} />
                    <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
                        <TenderBars tenders={r.tenders} />
                        <AuditLog
                            rows={r.audit}
                            canVoid={open && can('orders.settle')}
                            onVoid={(row) => {
                                setVoidError('');
                                setVoiding(row);
                            }}
                        />
                    </div>
                    <CashPanel report={r} />
                </>
            )}

            <CloseShiftDialog
                report={closing}
                closed={closed}
                busy={closeShift.isPending}
                error={closeError}
                onClose={() => {
                    setClosing(null);
                    setClosed(null);
                }}
                onPrint={print}
                onConfirm={confirmClose}
            />
            <VoidDialog row={voiding} busy={voidOrder.isPending} error={voidError} onClose={() => setVoiding(null)} onConfirm={confirmVoid} />
        </div>
    );
};

export default Reports;
