import type { ShiftReport } from '@shared/model';
import { dateTime, money, zLabel } from '../format';

// Cash drawer + the X / Z-reading figures (design §5.7, §7.9, decisions 14–15).
// Open shift: a live X-reading. Closed shift: its saved Z-reading.

const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'good' | 'bad' }) => (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        <span>{label}</span>
        <span className={`font-mono ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : ''}`}>{value}</span>
    </div>
);

const CashPanel = ({ report }: { report: ShiftReport }) => {
    const z = report.z_reading;
    const os = report.cash.over_short;
    return (
        <section className="grid gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:grid-cols-2">
            <div>
                <h2 className="mb-2 text-base font-extrabold tracking-wide text-slate-900">CASH DRAWER</h2>
                <Row label="Starting cash" value={money(report.cash.opening)} />
                <Row label="Cash sales" value={money(report.cash.sales)} />
                <Row label="Cash refunds (voids)" value={report.cash.refunds ? `−${money(report.cash.refunds)}` : money(0)} />
                <Row label="Expected in drawer" value={money(report.cash.expected)} strong />
                <Row label="Counted" value={report.cash.counted === null ? 'at Close Shift' : money(report.cash.counted)} />
                {os !== null && <Row label={os === 0 ? 'Balanced' : os > 0 ? 'Over' : 'Short'} value={money(os)} strong tone={os === 0 ? 'good' : 'bad'} />}
            </div>
            <div>
                <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold tracking-wide text-slate-900">
                    {z ? `Z-READING ${zLabel(z.z_number)}` : 'X-READING'}
                    {!z && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">LIVE</span>}
                </h2>
                <Row label="Sales before discounts" value={money(report.subtotal)} />
                <Row label="Discounts & VAT exemption" value={report.discount_total ? `−${money(report.discount_total)}` : money(0)} />
                <Row label="Gross shift sales" value={money(report.gross_sales)} strong />
                <Row label="VATable sales · VAT 12%" value={`${money(report.vatable_sales)} · ${money(report.vat_amount)}`} />
                <Row label="VAT-exempt sales" value={money(report.vat_exempt_sales)} />
                <Row label={`Voids (${report.voids.count})`} value={money(report.voids.amount)} />
                <Row label="Orders" value={report.first_order_no ? `${report.first_order_no} – ${report.last_order_no}` : '—'} />
                {z && (
                    <>
                        <Row label="Grand total" value={`${money(z.grand_total_start)} → ${money(z.grand_total_end)}`} />
                        <p className="mt-2 text-xs text-slate-400">
                            Saved {dateTime(z.generated_at)} by {z.generated_by}. A Z-reading never changes.
                        </p>
                    </>
                )}
            </div>
        </section>
    );
};

export default CashPanel;
