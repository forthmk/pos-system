import type { OrderSummary } from '@shared/model';
import { printSlip } from './printSlip';

/* ──────────────────────────────────────────────────────────────────────────
 * The register's customer receipt (design §5.3–5.4: "print receipt" after
 * Payment Settled): store, order number, IN / OUT, lines with extras,
 * subtotal, discount (Senior / PWD ID and name), VAT split, total, tender,
 * cash and change, reference no. Printed like the kiosk slip (browser print,
 * 58 mm); BIR official-receipt fields are a later decision (design 15).
 * ────────────────────────────────────────────────────────────────────────── */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const row = (l: string, r: string, cls = '') => `<div class="row ${cls}"><span>${l}</span><span>${r}</span></div>`;

export function receiptHtml(order: OrderSummary, opts: { storeName: string; terminalCode: string; cashierName: string }): string {
    const paid = order.paid_at ? new Date(order.paid_at) : new Date();
    const p = order.payment;
    const d = order.discount;
    const lines = order.lines
        .map((l) => row(`${l.quantity} x ${esc(l.name)}`, money(l.line_total)) + l.addons.map((a) => `<div class="extra">+ ${esc(a.name)} ${money(a.price)}</div>`).join(''))
        .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${order.order_no}</title><style>
@page { size: 58mm auto; margin: 0; }
body { width: 50mm; margin: 3mm auto; font: 11px/1.35 Menlo, monospace; color: #000; }
.c { text-align: center; } .b { font-weight: 700; } .big { font-size: 14px; font-weight: 800; }
hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
.row { display: flex; justify-content: space-between; gap: 6px; }
.extra { padding-left: 10px; font-size: 10px; }
.total { font-size: 13px; font-weight: 800; }
</style></head><body>
<div class="c big">${esc(opts.storeName)}</div>
<div class="c">${esc(opts.terminalCode)} · Cashier: ${esc(opts.cashierName)}</div>
<div class="c">${paid.toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' })} ${paid.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</div>
<hr>
${row('Order', order.order_no, 'b')}
${row('Dining', order.dining_mode === 'IN' ? 'IN (Dine-in)' : 'OUT (Take-out)')}
<hr>
${lines}
<hr>
${row('Items', String(order.item_count))}
${row('Subtotal', money(order.subtotal))}
${d ? row(`Less ${esc(d.label)}`, `-${money(d.amount + d.vat_removed)}`) : ''}
${d?.id_number ? `<div>ID ${esc(d.id_number)} · ${esc(d.holder_name ?? '')}</div>` : ''}
${row('TOTAL', `PHP ${money(order.total_due)}`, 'total')}
<hr>
${row('VATable sales', money(order.vatable_sales))}
${row('VAT (12%)', money(order.vat_amount))}
${row('VAT-exempt sales', money(order.vat_exempt_sales))}
<hr>
${p ? row(p.method === 'gcash' ? 'GCash' : p.method === 'card' ? 'Card' : 'Cash', money(p.tendered ?? p.amount)) : ''}
${p?.change_due !== null && p?.change_due !== undefined ? row('Change', money(p.change_due), 'b') : ''}
${p?.reference_no ? row('Ref no.', esc(p.reference_no)) : ''}
<hr>
<div class="c">Thank you! Please come again.</div>
</body></html>`;
}

export const printReceipt = (order: OrderSummary, opts: { storeName: string; terminalCode: string; cashierName: string }) => printSlip(receiptHtml(order, opts));
