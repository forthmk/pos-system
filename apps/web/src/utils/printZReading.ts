import type { ShiftReport } from '@shared/model';
import { printSlip } from './printSlip';

/* ──────────────────────────────────────────────────────────────────────────
 * The Z-reading printout (design §5.7, decision 15) on the register's 58 mm
 * printer: Z number, terminal, cashier, period, sales before discounts,
 * discounts, gross sales, VAT split, tenders, voids / refunds, first / last
 * order, cash drawer with over / short, and the running grand total.
 * While the shift is open the same layout prints as an X-reading.
 * ────────────────────────────────────────────────────────────────────────── */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const row = (l: string, r: string, cls = '') => `<div class="row ${cls}"><span>${l}</span><span>${r}</span></div>`;
const when = (iso: string) => new Date(iso).toLocaleString('en-PH', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function zReadingHtml(r: ShiftReport, storeName: string): string {
    const z = r.z_reading;
    const title = z ? `Z-READING Z-${String(z.z_number).padStart(4, '0')}` : 'X-READING (shift still open)';
    const tender = (m: 'gcash' | 'cash' | 'card', label: string) => {
        const t = r.tenders.find((x) => x.method === m)!;
        return row(`${label} (${t.share_pct}%)`, money(t.total));
    };
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
@page { size: 58mm auto; margin: 0; }
body { width: 50mm; margin: 3mm auto; font: 11px/1.35 Menlo, monospace; color: #000; }
.c { text-align: center; } .b { font-weight: 700; } .big { font-size: 14px; font-weight: 800; }
hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
.row { display: flex; justify-content: space-between; gap: 6px; }
</style></head><body>
<div class="c big">${esc(storeName)}</div>
<div class="c b">${title}</div>
<div class="c">${esc(r.shift.terminal_code)} · ${esc(r.shift.cashier_name)}</div>
<hr>
${row('From', when(r.shift.opened_at))}
${row('To', r.shift.closed_at ? when(r.shift.closed_at) : when(r.server_time))}
${row('Orders', r.first_order_no ? `${r.first_order_no.slice(-6)}–${(r.last_order_no ?? '').slice(-6)}` : '—')}
<hr>
${row('Transactions', String(r.transactions))}
${row('IN / OUT', `${r.in_count} / ${r.out_count}`)}
${row('Items sold', String(r.items_sold))}
<hr>
${row('Sales before disc.', money(r.subtotal))}
${row('Less disc. & VAT ex.', money(r.discount_total))}
${row('GROSS SALES', money(r.gross_sales), 'b')}
${row('VATable sales', money(r.vatable_sales))}
${row('VAT (12%)', money(r.vat_amount))}
${row('VAT-exempt sales', money(r.vat_exempt_sales))}
<hr>
${tender('gcash', 'GCash')}
${tender('cash', 'Cash')}
${tender('card', 'Card')}
${row(`Voids (${r.voids.count})`, money(r.voids.amount))}
${row('Refunds', money(r.refunds_amount))}
<hr>
${row('Starting cash', money(r.cash.opening))}
${row('Cash sales', money(r.cash.sales))}
${row('Cash refunds', money(r.cash.refunds))}
${row('Expected cash', money(r.cash.expected), 'b')}
${r.cash.counted !== null ? row('Counted cash', money(r.cash.counted)) : ''}
${r.cash.over_short !== null ? row(r.cash.over_short === 0 ? 'Balanced' : r.cash.over_short > 0 ? 'OVER' : 'SHORT', money(r.cash.over_short), 'b') : ''}
${z ? `<hr>${row('Grand total start', money(z.grand_total_start))}${row('Grand total end', money(z.grand_total_end))}<div class="c">Generated ${when(z.generated_at)} · ${esc(z.generated_by)}</div>` : ''}
</body></html>`;
}

export const printZReading = (r: ShiftReport, storeName = 'QUICKBITE #01') => printSlip(zReadingHtml(r, storeName));
