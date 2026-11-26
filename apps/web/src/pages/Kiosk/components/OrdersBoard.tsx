import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHat, CircleCheck, X } from 'lucide-react';
import type { OrdersBoard as Board } from '@shared/model';

/* ──────────────────────────────────────────────────────────────────────────
 * The kiosk's Orders board (design decision 8, §5.6): order numbers being
 * prepared and ready to collect, live from the kitchen. Opened from the
 * "Orders" button on the start screen; closes itself after a minute so the
 * kiosk is back on its start screen for the next customer.
 * ────────────────────────────────────────────────────────────────────────── */

const AUTO_CLOSE_MS = 60_000;

const Column = ({ title, numbers, tone, icon }: { title: string; numbers: string[]; tone: 'orange' | 'green'; icon: React.ReactNode }) => (
    <section className={`flex flex-col rounded-3xl p-5 ring-2 ${tone === 'green' ? 'bg-emerald-50 ring-emerald-200' : 'bg-orange-50 ring-orange-200'}`}>
        <h3 className={`mb-4 flex items-center gap-2 text-2xl font-extrabold ${tone === 'green' ? 'text-green-800' : 'text-orange-600'}`}>
            {icon} {title}
            <span className="ml-auto text-xl">{numbers.length}</span>
        </h3>
        {numbers.length === 0 ? (
            <p className="py-8 text-center text-lg font-medium text-slate-400">—</p>
        ) : (
            <ul className="grid grid-cols-2 gap-3">
                {numbers.map((n) => (
                    <li
                        key={n}
                        className={`rounded-2xl bg-white py-3 text-center font-mono text-3xl font-extrabold tracking-wider shadow-sm ${tone === 'green' ? 'text-green-800' : 'text-slate-800'}`}
                    >
                        {n}
                    </li>
                ))}
            </ul>
        )}
    </section>
);

const OrdersBoard = ({ board, onClose }: { board: Board | undefined; onClose: () => void }) => {
    const { t } = useTranslation();
    useEffect(() => {
        const id = setTimeout(onClose, AUTO_CLOSE_MS);
        return () => clearTimeout(id);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#FFF8F0] px-5 pb-8 pt-6 sm:px-10" role="dialog" aria-modal="true" aria-label={t('kiosk.orders')}>
            <div className="flex items-center justify-between">
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{t('kiosk.orders')}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-lg font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 active:scale-95"
                >
                    <X className="h-5 w-5" /> {t('kiosk.close')}
                </button>
            </div>
            <p className="mt-2 text-lg font-medium text-slate-500">{t('kiosk.boardHint')}</p>
            <div className="mt-6 grid flex-1 content-start gap-5 sm:grid-cols-2">
                <Column title={t('kiosk.preparing')} numbers={board?.preparing ?? []} tone="orange" icon={<ChefHat className="h-7 w-7" />} />
                <Column title={t('kiosk.ready')} numbers={board?.ready ?? []} tone="green" icon={<CircleCheck className="h-7 w-7" />} />
            </div>
        </div>
    );
};

export default OrdersBoard;
