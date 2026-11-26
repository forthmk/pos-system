import type { ShiftReport } from '@shared/model';
import { money } from '../format';

// The four cards across the top (UI reference "Shift Sales & Z-Reading Report", design §7.9).

const Card = ({ label, children, foot }: { label: string; children: React.ReactNode; foot: React.ReactNode }) => (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</h3>
        <div className="mt-2 font-mono text-3xl font-extrabold tracking-tight">{children}</div>
        <p className="mt-1.5 text-sm font-semibold text-slate-500">{foot}</p>
    </section>
);

const StatCards = ({ report }: { report: ShiftReport }) => {
    const share = (m: 'gcash' | 'cash' | 'card') => report.tenders.find((t) => t.method === m)?.share_pct ?? 0;
    const vs = report.vs_yesterday_pct;
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card
                label="Gross shift sales"
                foot={
                    vs === null ? (
                        <span className="text-slate-400">No sales yesterday to compare</span>
                    ) : (
                        <span className={vs >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {vs >= 0 ? '+' : ''}
                            {vs.toFixed(1)}% vs yesterday
                        </span>
                    )
                }
            >
                <span className="text-slate-900">{money(report.gross_sales)}</span>
            </Card>
            <Card label="Total transactions" foot={`${report.in_count} IN • ${report.out_count} OUT`}>
                <span className="text-slate-900">{report.transactions}</span>
            </Card>
            <Card label="Average ticket value" foot={`${report.items_per_order} items / order`}>
                <span className="text-orange-600">{money(report.average_ticket)}</span>
            </Card>
            <Card label="GCash digital share" foot={`Cash ${share('cash')}% • Card ${share('card')}%`}>
                <span className="text-sky-600">{share('gcash')}%</span>
            </Card>
        </div>
    );
};

export default StatCards;
