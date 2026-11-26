import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Printer } from 'lucide-react';
import { kioskApi } from '@shared/api';
import type { OrderSummary } from '@shared/model';
import { formatSlipCode } from '@shared/utils';
import Barcode from '../../../components/pos/Barcode';
import { printSlip, slipHtml } from '../../../utils/printSlip';
import { peso } from '../cart';

// UI reference 6 — "Order Sent!": the order number, dining mode, payment,
// items, total and time, then "Start New Order (Ns)" counting down to a fresh
// start screen. A kiosk order waits for payment at the counter (design
// decision 1): the order slip with its barcode prints by itself (once per
// order), and the barcode also shows here so a 2D scanner can read the screen
// if the printer is out of paper (§7.10). "Reprint slip" prints it again.

const printed = new Set<number>(); // survives React's dev double-mount

interface Props {
    order: OrderSummary;
    resetSeconds: number;
    payWithinMinutes: number;
    terminalCode: string;
    onDone: () => void;
}

const OrderSentScreen = ({ order, resetSeconds, payWithinMinutes, terminalCode, onDone }: Props) => {
    const { t } = useTranslation();
    const [left, setLeft] = useState(resetSeconds);

    const print = () =>
        printSlip(slipHtml(order, { storeName: 'QUICKBITE', terminalCode, expiryMinutes: payWithinMinutes }))
            .then(() => kioskApi.slipPrinted(order.id))
            .catch(() => undefined);

    useEffect(() => {
        if (!order.slip_code || printed.has(order.id)) return;
        printed.add(order.id);
        void print();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.id]);

    useEffect(() => {
        if (left <= 0) {
            onDone();
            return;
        }
        const timer = window.setTimeout(() => setLeft((s) => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [left, onDone]);

    const payAtCounter = order.status === 'awaiting_payment';
    const rows: [string, React.ReactNode][] = [
        [t('kiosk.diningMode'), order.dining_mode === 'IN' ? `${t('kiosk.in')} (${t('kiosk.dineIn')})` : `${t('kiosk.out')} (${t('kiosk.takeOut')})`],
        [t('kiosk.payment'), <span className="text-sky-600">{t(`kiosk.${order.payment_method}`)}</span>],
        [t('kiosk.itemsOrdered'), t('kiosk.items', { count: order.item_count })],
        [payAtCounter ? t('kiosk.totalToPay') : t('kiosk.totalPaid'), <span className="text-emerald-600">{peso(order.total_due)}</span>],
        [t('kiosk.time'), new Date(order.placed_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })],
    ];

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[#FFF8F0] px-5 py-8">
            <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-orange-900/5 ring-1 ring-orange-100">
                <div className="h-3 bg-orange-500" />
                <div className="flex flex-col items-center px-6 pb-8 pt-8 text-center sm:px-10">
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                        <Check className="h-12 w-12" strokeWidth={3} />
                    </span>
                    <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{t('kiosk.orderSent')}</h1>
                    <p className="mt-2 text-xl font-bold text-orange-600">
                        {t('kiosk.orderNumber', { number: order.display_no })} • {payAtCounter ? t('kiosk.payAtCounter') : t('kiosk.preparingNow')}
                    </p>
                    <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">{t('kiosk.yourNumber')}</p>
                    <p className="text-7xl font-extrabold tabular-nums tracking-tight text-slate-900">{order.display_no}</p>

                    <dl className="mt-6 w-full space-y-3 rounded-3xl border-2 border-dashed border-slate-200 bg-[#FFFCF8] px-6 py-5 text-left">
                        {rows.map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-4">
                                <dt className="text-sm font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                                <dd className="text-right text-lg font-extrabold uppercase text-slate-900">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    {order.slip_code && (
                        <div className="mt-5 flex flex-col items-center">
                            <Barcode value={order.slip_code} height={56} />
                            <span className="mt-1 font-mono text-sm font-bold text-slate-700">{formatSlipCode(order.slip_code)}</span>
                        </div>
                    )}
                    {payAtCounter && <p className="mt-4 text-base font-semibold text-slate-600">{t('kiosk.bringSlip', { minutes: payWithinMinutes })}</p>}
                    {order.slip_code && (
                        <button type="button" onClick={() => void print()} className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-bold text-slate-700 ring-1 ring-slate-200">
                            <Printer className="h-5 w-5" /> {t('kiosk.reprintSlip')}
                        </button>
                    )}

                    <button type="button" onClick={onDone} className="mt-6 w-full rounded-3xl bg-slate-900 py-5 text-xl font-extrabold text-white">
                        {t('kiosk.startNewOrder', { seconds: left })}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSentScreen;
