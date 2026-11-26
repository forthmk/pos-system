import JsBarcode from 'jsbarcode';
import { formatSlipCode } from '@shared/utils';
import type { OrderSummary } from '@shared/model';

/* ──────────────────────────────────────────────────────────────────────────
 * The kiosk order slip (design §5.9): 80 mm, English, "Not an official
 * receipt", big order number, IN / OUT, lines with extras, total, payment
 * and the Code 128 barcode the cashier scans.
 *
 * Printed through the browser (hidden iframe → print). Chrome started with
 * --kiosk-printing prints straight to the default printer with no dialog;
 * in the APK this moves to @forthmk/thermal-printer.
 * ────────────────────────────────────────────────────────────────────────── */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PAYMENT = { gcash: 'GCASH', cash: 'CASH', card: 'CARD' } as const;

function barcodeSvg(code: string): string {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, code, { format: 'CODE128C', displayValue: false, height: 60, width: 2.2, margin: 0 });
    return svg.outerHTML;
}

export function slipHtml(order: OrderSummary, opts: { storeName: string; terminalCode: string; expiryMinutes: number }): string {
    const placed = new Date(order.placed_at);
    const lines = order.lines
        .map(
            (l) =>
                `<div class="row"><span>${l.quantity} x ${esc(l.name)}</span><span>${money(l.line_total)}</span></div>` +
                l.addons.map((a) => `<div class="extra">+ ${esc(a.name)}</div>`).join(''),
        )
        .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Order slip ${order.display_no}</title><style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
body { width: 72mm; margin: 4mm auto; font: 12px/1.35 'Helvetica Neue', Arial, sans-serif; color: #000; }
.c { text-align: center; } .b { font-weight: 700; }
.store { font-size: 18px; font-weight: 800; } .sub { font-size: 11px; }
.num { font-size: 44px; font-weight: 800; letter-spacing: 1px; margin: 2px 0; }
.mode { font-size: 16px; font-weight: 800; }
hr { border: 0; border-top: 1.5px dashed #000; margin: 6px 0; }
.row { display: flex; justify-content: space-between; gap: 8px; font-family: Menlo, monospace; font-size: 12px; }
.extra { font-family: Menlo, monospace; font-size: 11px; padding-left: 14px; }
.total { font-size: 16px; font-weight: 800; }
.code { font-family: Menlo, monospace; font-weight: 700; font-size: 13px; margin-top: 4px; }
svg { display: block; margin: 6px auto 0; max-width: 100%; }
</style></head><body>
<div class="c store">${esc(opts.storeName)}</div>
<div class="c b">ORDER SLIP</div>
<div class="c sub">Not an official receipt</div>
<hr>
<div class="c sub">ORDER NO.</div>
<div class="c num">${order.display_no}</div>
<div class="c mode">${order.dining_mode === 'IN' ? 'IN · DINE-IN' : 'OUT · TAKE-OUT'}</div>
<div class="c sub">${placed.toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' })} ${placed.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} · ${esc(opts.terminalCode)}</div>
<hr>
${lines}
<hr>
<div class="row"><span>Items</span><span>${order.item_count}</span></div>
<div class="row total"><span>TOTAL</span><span>PHP ${money(order.total_due)}</span></div>
<div class="b">Payment: ${PAYMENT[order.payment_method]} — pay at the counter</div>
<hr>
${order.slip_code ? `${barcodeSvg(order.slip_code)}<div class="c code">${formatSlipCode(order.slip_code)}</div>` : ''}
<div class="c sub" style="margin-top:4px">Bring this slip to the counter<br>within ${opts.expiryMinutes} minutes. Thank you!</div>
</body></html>`;
}

/** Prints the slip from a hidden iframe. Resolves once the print was sent. */
export async function printSlip(html: string): Promise<void> {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((r) => setTimeout(r, 150));
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
}
