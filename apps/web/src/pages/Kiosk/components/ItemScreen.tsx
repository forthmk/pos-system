import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, ShoppingCart } from 'lucide-react';
import type { MenuItem } from '@shared/model';
import MenuIcon from './MenuIcon';
import QtyStepper from './QtyStepper';
import { peso } from '../cart';

// UI references 3–4: the item (picture, NAME, PRICE), quantity − / +, the
// extras it offers (tick any; sold-out ones can't be ticked), and
// "Add to Order ₱(price + extras) × qty".

const ItemScreen = ({
    item,
    categoryCode,
    cartCount,
    onBack,
    onAdd,
}: {
    item: MenuItem;
    categoryCode: string;
    cartCount: number;
    onBack: () => void;
    onAdd: (quantity: number, addonIds: number[]) => void;
}) => {
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState(1);
    const [picked, setPicked] = useState<number[]>([]);

    const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const unitCents = Math.round(item.price * 100) + item.addons.filter((a) => picked.includes(a.id)).reduce((s, a) => s + Math.round(a.price * 100), 0);
    const total = (unitCents * quantity) / 100;

    return (
        <div className="flex h-dvh flex-col bg-[#FFF8F0]">
            <div className="flex items-start justify-between px-5 pt-5">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{t('kiosk.order')}</h1>
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label={t('kiosk.backToMenu')}
                        className="mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200"
                    >
                        <ArrowLeft className="h-7 w-7" />
                    </button>
                </div>
                <span className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <ShoppingCart className="h-6 w-6" />
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-orange-500 px-2 text-sm font-bold text-white">{cartCount}</span>
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
                <div className="mx-auto mt-4 flex h-52 w-52 items-center justify-center rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
                    <MenuIcon categoryCode={categoryCode} imageUrl={item.image_url} size="lg" />
                </div>
                <dl className="mx-auto mt-8 max-w-lg space-y-4">
                    <div className="flex items-end justify-between gap-6 border-b-2 border-slate-200 pb-2">
                        <dt className="text-lg font-bold tracking-wider text-slate-400">{t('kiosk.name')}</dt>
                        <dd className="text-right text-2xl font-extrabold text-slate-900">{item.name}</dd>
                    </div>
                    <div className="flex items-end justify-between gap-6 border-b-2 border-slate-200 pb-2">
                        <dt className="text-lg font-bold tracking-wider text-slate-400">{t('kiosk.price')}</dt>
                        <dd className="text-2xl font-extrabold text-orange-600">{peso(item.price)}</dd>
                    </div>
                </dl>
                <div className="mt-8 flex justify-center">
                    <QtyStepper value={quantity} onChange={setQuantity} />
                </div>

                {item.addons.length > 0 && (
                    <section className="mx-auto mt-10 max-w-2xl border-t-2 border-slate-200 pt-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold tracking-wider text-slate-500">{t('kiosk.extras')}</h2>
                            {item.addons.length > 4 && <span className="text-sm font-semibold text-slate-400">{t('kiosk.scrollMore')}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {item.addons.map((a) => {
                                const on = picked.includes(a.id);
                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        disabled={!a.available}
                                        aria-pressed={on}
                                        onClick={() => toggle(a.id)}
                                        className={`flex items-center justify-between gap-2 rounded-3xl bg-white px-4 py-4 text-left ring-2 transition disabled:opacity-50 ${
                                            on ? 'bg-orange-50 ring-orange-500' : 'ring-slate-100'
                                        }`}
                                    >
                                        <span>
                                            <span className="block text-lg font-bold text-slate-900">{a.name}</span>
                                            <span className="block font-bold text-orange-600">{a.available ? `+${peso(a.price)}` : t('kiosk.soldOut')}</span>
                                        </span>
                                        {on && (
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                                                <Check className="h-5 w-5" strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>

            <div className="px-5 pb-5">
                <button
                    type="button"
                    onClick={() => onAdd(quantity, picked)}
                    className="flex w-full items-center justify-between rounded-3xl bg-orange-500 px-6 py-5 text-2xl font-extrabold text-white shadow-lg shadow-orange-500/30 active:scale-[0.99]"
                >
                    {t('kiosk.addToOrder')}
                    <span className="rounded-full bg-white/25 px-4 py-1">{peso(total)}</span>
                </button>
            </div>
        </div>
    );
};

export default ItemScreen;
