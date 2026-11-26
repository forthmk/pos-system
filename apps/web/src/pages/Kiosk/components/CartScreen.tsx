import { useTranslation } from 'react-i18next';
import { House, ShoppingCart } from 'lucide-react';
import QtyStepper from './QtyStepper';
import { cartTotals, lineName, peso, type DiningMode, type PaymentMethod, type PricedLine } from '../cart';

// UI reference 5: Cart — IN • Dine-In, N items; each line "Name (+ extras)",
// "₱each • ₱line", qty − / + (0 removes it); Mode of payment GCash / Cash /
// Card; Total order; Proceed Order (sends the order — design §7.2).

const PAYMENTS: PaymentMethod[] = ['gcash', 'cash', 'card'];

const CartScreen = ({
    mode,
    lines,
    payment,
    onPayment,
    onQuantity,
    onMenu,
    onProceed,
    sending,
    error,
}: {
    mode: DiningMode;
    lines: PricedLine[];
    payment: PaymentMethod;
    onPayment: (p: PaymentMethod) => void;
    onQuantity: (key: string, quantity: number) => void;
    onMenu: () => void;
    onProceed: () => void;
    sending: boolean;
    error: string;
}) => {
    const { t } = useTranslation();
    const { count, total } = cartTotals(lines);

    return (
        <div className="flex h-dvh flex-col bg-[#FFF8F0]">
            <div className="flex items-start justify-between border-b border-orange-100 px-5 pb-4 pt-5">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{t('kiosk.cart')}</h1>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-600">
                            {mode === 'IN' ? `${t('kiosk.in')} • ${t('kiosk.dineIn')}` : `${t('kiosk.out')} • ${t('kiosk.takeOut')}`}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">{t('kiosk.items', { count })}</span>
                    </div>
                </div>
                <button type="button" onClick={onMenu} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-lg font-bold ring-1 ring-slate-200">
                    <House className="h-5 w-5 text-orange-500" />
                    {t('kiosk.home')}
                </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {lines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                            <ShoppingCart className="h-8 w-8" />
                        </span>
                        <p className="text-xl font-bold text-slate-800">{t('kiosk.emptyCart')}</p>
                        <p className="text-slate-500">{t('kiosk.emptyCartHint')}</p>
                        <button type="button" onClick={onMenu} className="mt-2 rounded-2xl bg-orange-500 px-6 py-3 text-lg font-bold text-white">
                            {t('kiosk.backToMenu')}
                        </button>
                    </div>
                ) : (
                    lines.map((line) => (
                        <div
                            key={line.key}
                            className={`flex items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ${line.unavailable ? 'ring-rose-300' : 'ring-slate-100'}`}
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xl font-extrabold text-slate-900">{lineName(line)}</p>
                                <p className="text-sm font-semibold text-slate-400">
                                    {line.unavailable ? (
                                        <span className="text-rose-600">{t('kiosk.soldOut')}</span>
                                    ) : (
                                        `${peso(line.unitPrice)} ${t('kiosk.each')} • ${peso(line.lineTotal)}`
                                    )}
                                </p>
                            </div>
                            <QtyStepper value={line.quantity} min={0} onChange={(q) => onQuantity(line.key, q)} size="md" />
                        </div>
                    ))
                )}
            </div>

            {lines.length > 0 && (
                <div className="space-y-4 border-t border-orange-100 bg-white px-5 pb-5 pt-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold text-slate-900">{t('kiosk.modeOfPayment')}</span>
                        <span className="text-xl font-extrabold text-sky-600">{t(`kiosk.${payment}`)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {PAYMENTS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                aria-pressed={payment === p}
                                onClick={() => onPayment(p)}
                                className={`rounded-2xl py-3.5 text-lg font-bold ring-2 ${payment === p ? 'bg-sky-50 text-sky-700 ring-sky-500' : 'bg-white text-slate-600 ring-slate-200'}`}
                            >
                                {t(`kiosk.${p}`)}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-end justify-between border-b-[3px] border-slate-900 pb-1">
                        <span className="text-xl font-extrabold text-slate-900">{t('kiosk.total')}</span>
                        <span className="text-4xl font-extrabold text-orange-600">{peso(total)}</span>
                    </div>
                    {error && (
                        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-center text-base font-bold text-rose-700 ring-1 ring-rose-200">
                            {error}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={onProceed}
                        disabled={sending || lines.some((l) => l.unavailable)}
                        className="w-full rounded-3xl bg-orange-500 py-5 text-2xl font-extrabold text-white shadow-lg shadow-orange-500/30 disabled:opacity-50"
                    >
                        {sending ? t('kiosk.sending') : t('kiosk.proceed')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CartScreen;
