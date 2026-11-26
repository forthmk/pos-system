import type { TenderLine } from '@shared/model';
import { money } from '../format';

// Tender Reconciliation: money per payment method (settled, not voided) and its share.

const ROWS: { method: TenderLine['method']; label: string; bar: string }[] = [
    { method: 'gcash', label: 'GCash E-Wallet', bar: 'bg-sky-500' },
    { method: 'cash', label: 'Cash Drawer', bar: 'bg-emerald-500' },
    { method: 'card', label: 'Credit / Debit Card', bar: 'bg-orange-500' },
];

const TenderBars = ({ tenders }: { tenders: TenderLine[] }) => (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-5 text-base font-extrabold tracking-wide text-slate-900">TENDER RECONCILIATION</h2>
        <ul className="space-y-5">
            {ROWS.map((r) => {
                const t = tenders.find((x) => x.method === r.method) ?? { total: 0, share_pct: 0 };
                return (
                    <li key={r.method}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                            <span className="font-semibold text-slate-800">
                                {r.label} ({t.share_pct}%)
                            </span>
                            <span className="font-mono font-bold text-slate-900">{money(t.total)}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100">
                            <div className={`h-2.5 rounded-full ${r.bar} transition-all`} style={{ width: `${t.share_pct}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    </section>
);

export default TenderBars;
