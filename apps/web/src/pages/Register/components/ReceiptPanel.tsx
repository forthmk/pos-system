import { Lock, ReceiptText } from 'lucide-react';
import type { PricedOrder } from '@shared/utils';
import { formatSlipCode } from '@shared/utils';
import { peso } from '../../Kiosk/cart';
import type { Ticket, TicketLineView } from '../ticket';

// UI reference: RECEIPT · IN / OUT · ORD-000750; QUICKBITE #01 • POS-01 and
// the rate ("Regular Rate", "Student (10%)"); the lines with − / +; Cash +
// Exact + Change (or the GCash / card reference); Subtotal, Discount, TOTAL DUE.

const money = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
    ticket: Ticket;
    lines: TicketLineView[];
    priced: PricedOrder;
    orderNo: string;
    terminalCode: string;
    rateLabel: string;
    error: string;
    onQuantity: (key: string, quantity: number) => void;
    onTendered: (value: string) => void;
    onReference: (value: string) => void;
}

const ReceiptPanel = ({ ticket, lines, priced, orderNo, terminalCode, rateLabel, error, onQuantity, onTendered, onReference }: Props) => {
    const tendered = Number(ticket.tendered || 0);
    const change = Math.max(0, Math.round((tendered - priced.total_due) * 100) / 100);
    const scanned = ticket.scanned?.order;

    return (
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
                <span className="flex items-center gap-2 text-lg font-extrabold tracking-wide">
                    <ReceiptText className="h-5 w-5 text-orange-400" /> RECEIPT
                </span>
                <span className="flex items-center gap-2 font-mono text-sm font-bold">
                    <span className={`rounded-md px-2 py-0.5 ${ticket.mode === 'IN' ? 'bg-orange-500' : 'bg-emerald-600'}`}>{ticket.mode}</span>
                    {scanned?.order_no ?? orderNo}
                </span>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 px-5 py-2 font-mono text-xs text-slate-500">
                <span>{scanned ? `KIOSK ORDER · ${scanned.slip_code ? formatSlipCode(scanned.slip_code) : ''}` : `QUICKBITE #01 • ${terminalCode}`}</span>
                <span className="font-sans text-sm font-bold text-emerald-700">{rateLabel}</span>
            </div>

            <div className="min-h-40 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {lines.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center font-mono">
                        <p className="font-bold text-slate-500">No items on ticket</p>
                        <p className="text-sm text-slate-400">Tap any menu tile on the left, or scan a kiosk slip.</p>
                    </div>
                ) : (
                    lines.map((l) => (
                        <div key={l.key} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ${l.unavailable ? 'ring-rose-300' : 'ring-slate-200'}`}>
                            <div className="min-w-0 font-mono">
                                <p className="truncate font-bold text-slate-900">{l.name}</p>
                                {l.extras.length > 0 && <p className="truncate text-xs text-slate-500">+ {l.extras.join(', ')}</p>}
                                <p className="text-sm text-slate-500">
                                    {l.unavailable ? <span className="text-rose-600">Sold out</span> : `${money(l.unitPrice)} × ${l.quantity} = ${money(l.lineTotal)}`}
                                </p>
                            </div>
                            {l.editable ? (
                                <div className="flex items-center gap-2">
                                    <button type="button" aria-label="One less" onClick={() => onQuantity(l.key, l.quantity - 1)} className="h-10 w-10 rounded-xl text-xl font-bold ring-1 ring-slate-200">
                                        −
                                    </button>
                                    <span className="w-7 text-center font-mono font-bold">{l.quantity}</span>
                                    <button type="button" aria-label="One more" onClick={() => onQuantity(l.key, l.quantity + 1)} className="h-10 w-10 rounded-xl bg-slate-900 text-xl font-bold text-white">
                                        +
                                    </button>
                                </div>
                            ) : (
                                <span className="font-mono text-lg font-bold">×{l.quantity}</span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {ticket.scanned && (
                <p className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5" /> Scanned kiosk order — on this register until{' '}
                    {new Date(ticket.scanned.lockedUntil).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                </p>
            )}

            {lines.length > 0 && ticket.method === 'cash' && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 bg-emerald-50/60 px-5 py-3">
                    <label className="flex items-center gap-2 font-bold text-slate-700">
                        Cash:
                        <input
                            value={ticket.tendered}
                            onChange={(e) => onTendered(e.target.value.replace(/[^\d.]/g, ''))}
                            inputMode="decimal"
                            placeholder="0.00"
                            aria-label="Cash received"
                            className="w-32 rounded-lg bg-white px-3 py-2 text-right font-mono ring-1 ring-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </label>
                    <button type="button" onClick={() => onTendered(priced.total_due.toFixed(2))} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
                        Exact
                    </button>
                    <span className="font-mono font-bold text-emerald-800">Change: {money(tendered >= priced.total_due ? change : 0)}</span>
                </div>
            )}
            {lines.length > 0 && ticket.method !== 'cash' && (
                <div className="flex items-center gap-3 border-t border-sky-100 bg-sky-50/60 px-5 py-3">
                    <label className="flex flex-1 items-center gap-2 font-bold text-slate-700">
                        {ticket.method === 'gcash' ? 'GCash ref no.:' : 'Card ref no.:'}
                        <input
                            value={ticket.reference}
                            onChange={(e) => onReference(e.target.value)}
                            maxLength={30}
                            placeholder="e.g. 5012 345 678"
                            aria-label="Reference number"
                            className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 font-mono ring-1 ring-sky-200 outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </label>
                </div>
            )}

            <div className="space-y-1 border-t border-dashed border-slate-200 px-5 py-4 font-mono text-sm">
                <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{money(priced.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                    <span>Discount ({rateLabel})</span>
                    <span>-{money(priced.discount_total + priced.discount.vat_removed)}</span>
                </div>
                <div className="flex items-end justify-between border-t border-slate-200 pt-2">
                    <span className="text-base font-extrabold text-slate-900">TOTAL DUE</span>
                    <span className="text-3xl font-extrabold text-orange-600">{peso(priced.total_due)}</span>
                </div>
                {error && (
                    <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 font-sans text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                        {error}
                    </p>
                )}
            </div>
        </section>
    );
};

export default ReceiptPanel;
