import type { AuditRow } from '@shared/model';
import { money, TENDER_LABEL, time } from '../format';

// Transaction Audit Log: every order paid in the shift, newest first.
// Voided orders stay listed (VOID, amount struck through). "Void" shows
// while the shift is open, for who may ask for one (a manager approves).

const AuditLog = ({ rows, canVoid, onVoid }: { rows: AuditRow[]; canVoid: boolean; onVoid: (row: AuditRow) => void }) => (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-extrabold tracking-wide text-slate-900">TRANSACTION AUDIT LOG</h2>
            <span className="text-sm font-semibold text-slate-400">Latest Settled Receipts</span>
        </div>
        {rows.length === 0 ? (
            <p className="py-10 text-center text-sm font-medium text-slate-400">No paid orders in this shift yet.</p>
        ) : (
            <div className="max-h-[28rem] overflow-auto">
                <table className="w-full min-w-[640px] text-sm">
                    <thead className="sticky top-0 bg-white text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                        <tr className="border-b border-slate-200!">
                            <th className="py-2.5 pr-3">Order #</th>
                            <th className="py-2.5 pr-3">Mode</th>
                            <th className="py-2.5 pr-3">Items</th>
                            <th className="py-2.5 pr-3">Tender</th>
                            <th className="py-2.5 pr-3 text-right">Amount</th>
                            {canVoid && <th className="py-2.5" aria-label="Actions" />}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const voided = r.status === 'voided';
                            return (
                                <tr key={r.order_id} className={`border-b border-slate-100! ${voided ? 'text-slate-400' : 'text-slate-800'}`}>
                                    <td className="py-3 pr-3 font-mono font-bold">
                                        {r.order_no}
                                        <span className="block font-sans text-xs font-medium text-slate-400">
                                            {time(r.paid_at)} · {r.source === 'kiosk' ? 'Kiosk' : 'POS'}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-3">
                                        <span className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${r.dining_mode === 'IN' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                            {r.dining_mode}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-3">{r.items}</td>
                                    <td className="py-3 pr-3 font-semibold">{r.method ? TENDER_LABEL[r.method] : '—'}</td>
                                    <td className="py-3 pr-3 text-right font-mono font-bold">
                                        {voided && <span className="mr-2 rounded bg-rose-50 px-1.5 py-0.5 font-sans text-[11px] font-extrabold text-rose-600">VOID</span>}
                                        <span className={voided ? 'line-through' : ''}>{money(r.total)}</span>
                                    </td>
                                    {canVoid && (
                                        <td className="py-3 text-right">
                                            {!voided && (
                                                <button
                                                    type="button"
                                                    onClick={() => onVoid(r)}
                                                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50"
                                                >
                                                    Void
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
    </section>
);

export default AuditLog;
