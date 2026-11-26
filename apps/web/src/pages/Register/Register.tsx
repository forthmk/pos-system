import { useState } from 'react';
import { CircleAlert, CircleCheck, Clock, Lock, ScanBarcode } from 'lucide-react';
import type { OrderSummary, ScanResult } from '@shared/model';
import { formatSlipCode, parseSlipCode } from '@shared/utils';
import { useReleaseOrder, useScanSlip } from '../../hooks/api/usePos';
import { useScannerInput } from '../../hooks/useScannerInput';
import { friendlyError } from '../../utils/friendlyError';
import { peso } from '../Kiosk/cart';

/* ──────────────────────────────────────────────────────────────────────────
 * Cashier Register — kiosk slip scan (design §5.10, QB-006). Scanning a slip
 * (the barcode scanner types the code; no box needs to be selected) or typing
 * its number shows the order here, locked to this register. Taking payment,
 * walk-in tickets, discounts and the Kiosk # list are added in QB-007.
 * ────────────────────────────────────────────────────────────────────────── */

const PAYMENT = { gcash: 'GCash', cash: 'Cash', card: 'Card' } as const;

const OrderReceipt = ({ order, footer }: { order: OrderSummary; footer?: React.ReactNode }) => (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
            <span className="text-lg font-extrabold tracking-wide">RECEIPT</span>
            <span className="flex items-center gap-2 font-mono text-sm font-bold">
                <span className={`rounded-md px-2 py-0.5 ${order.dining_mode === 'IN' ? 'bg-orange-500' : 'bg-emerald-600'}`}>{order.dining_mode}</span>
                {order.order_no}
            </span>
        </div>
        <div className="flex items-center justify-between border-b border-dashed border-slate-200 px-5 py-2 font-mono text-xs text-slate-500">
            <span>KIOSK ORDER · {PAYMENT[order.payment_method].toUpperCase()}</span>
            {order.slip_code && <span>{formatSlipCode(order.slip_code)}</span>}
        </div>
        <ul className="divide-y divide-slate-100 px-5">
            {order.lines.map((l, i) => (
                <li key={i} className="py-3">
                    <div className="flex justify-between gap-4 font-mono text-sm">
                        <span className="font-bold text-slate-900">
                            {l.quantity} × {l.name}
                        </span>
                        <span className="font-bold">{peso(l.line_total)}</span>
                    </div>
                    {l.addons.map((a) => (
                        <div key={a.name} className="pl-6 font-mono text-xs text-slate-500">
                            + {a.name} ({peso(a.price)})
                        </div>
                    ))}
                </li>
            ))}
        </ul>
        <div className="space-y-1 border-t border-dashed border-slate-200 px-5 py-4 font-mono text-sm">
            <div className="flex justify-between text-slate-500">
                <span>Items</span>
                <span>{order.item_count}</span>
            </div>
            <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{peso(order.subtotal)}</span>
            </div>
            <div className="flex items-end justify-between pt-2">
                <span className="text-base font-extrabold text-slate-900">TOTAL DUE</span>
                <span className="text-3xl font-extrabold text-orange-600">{peso(order.total_due)}</span>
            </div>
        </div>
        {footer}
    </section>
);

const Notice = ({ tone, icon, title, children }: { tone: 'info' | 'warn' | 'error'; icon: React.ReactNode; title: string; children?: React.ReactNode }) => {
    const tones = { info: 'bg-sky-50 text-sky-800 ring-sky-200', warn: 'bg-amber-50 text-amber-800 ring-amber-200', error: 'bg-rose-50 text-rose-800 ring-rose-200' };
    return (
        <div role="status" className={`flex gap-3 rounded-2xl px-5 py-4 ring-1 ${tones[tone]}`}>
            <span className="mt-0.5 shrink-0 [&_svg]:h-6 [&_svg]:w-6">{icon}</span>
            <div>
                <p className="text-lg font-bold">{title}</p>
                {children && <div className="mt-1 text-sm">{children}</div>}
            </div>
        </div>
    );
};

const Register = () => {
    const scan = useScanSlip();
    const release = useReleaseOrder();
    const [typed, setTyped] = useState('');
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    const fail = (message: string) => {
        setError(message);
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
    };

    const lookUp = async (raw: string) => {
        // Check digit first: a bad read says "scan again" without asking the server.
        if (!parseSlipCode(raw)) return fail('That code can’t be read. Scan again or type the 12 digits under the barcode.');
        setError('');
        try {
            // A new scan replaces the order on screen; unlock the one being shown.
            if (result?.result === 'ready') await release.mutateAsync(result.order.id).catch(() => undefined);
            setResult(await scan.mutateAsync(raw));
            setTyped('');
        } catch (e) {
            fail(friendlyError(e, 'Could not look up that slip. Please try again.'));
        }
    };

    useScannerInput({ onScan: (code) => void lookUp(code) });

    const clear = async () => {
        if (result?.result === 'ready') await release.mutateAsync(result.order.id).catch(() => undefined);
        setResult(null);
    };

    return (
        <div className="mx-auto grid max-w-6xl gap-5 p-4 lg:grid-cols-[1fr_1.1fr]">
            <section className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                        <ScanBarcode className="h-7 w-7" />
                    </span>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900">Scan a kiosk slip</h1>
                        <p className="text-sm text-slate-500">Point the barcode scanner at the slip — the order opens here.</p>
                    </div>
                </div>
                <form
                    className={`mt-5 flex gap-2 ${shake ? 'field-shake' : ''}`}
                    onSubmit={(e) => {
                        e.preventDefault();
                        void lookUp(typed);
                    }}
                >
                    <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        inputMode="numeric"
                        placeholder="01-000748-527-8"
                        aria-label="Slip code"
                        className="form-field min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 font-mono text-lg"
                    />
                    <button type="submit" disabled={scan.isPending || !typed.trim()} className="rounded-xl bg-orange-500 px-5 font-bold text-white disabled:opacity-50">
                        {scan.isPending ? 'Looking…' : 'Find'}
                    </button>
                </form>
                <p role="alert" className="mt-3 min-h-5 text-sm font-medium text-rose-600">
                    {error}
                </p>
            </section>

            <div className="space-y-4">
                {!result && (
                    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center">
                        <p className="font-mono text-base font-bold text-slate-500">No order on ticket</p>
                        <p className="font-mono text-sm text-slate-400">Scan a kiosk slip to bring its order here.</p>
                    </div>
                )}
                {result?.result === 'ready' && (
                    <OrderReceipt
                        order={result.order}
                        footer={
                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                                <span className="flex items-center gap-2 text-sm text-slate-500">
                                    <Lock className="h-4 w-4" />
                                    On this register until {new Date(result.locked_until).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <button type="button" onClick={() => void clear()} className="rounded-xl bg-rose-600 px-5 py-2.5 font-bold text-white">
                                    CLEAR
                                </button>
                            </div>
                        }
                    />
                )}
                {result?.result === 'already_paid' && (
                    <Notice tone="info" icon={<CircleCheck />} title={`${result.order_no} is already paid`}>
                        It is {result.status === 'preparing' ? 'being prepared' : 'ready'} — nothing to charge.
                    </Notice>
                )}
                {result?.result === 'in_use' && (
                    <Notice tone="warn" icon={<Lock />} title={`${result.order_no} is being processed at ${result.terminal}`}>
                        Finish it there, or scan it again in a few minutes.
                    </Notice>
                )}
                {result?.result === 'voided' && <Notice tone="error" icon={<CircleAlert />} title={`${result.order_no} was voided`} />}
                {result?.result === 'expired' && (
                    <>
                        <Notice tone="warn" icon={<Clock />} title={`${result.order.order_no} expired`}>
                            It wasn’t paid in time and was cancelled. Ring it up again as a new order.
                        </Notice>
                        <OrderReceipt order={result.order} />
                    </>
                )}
            </div>
        </div>
    );
};

export default Register;
