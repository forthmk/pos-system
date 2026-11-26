import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import type { MenuCategory, MenuItem } from '@shared/model';
import MenuIcon from './MenuIcon';
import { peso } from '../cart';

// UI reference 2: categories down the left, the category's items as cards
// (name, price, + Add; sold out greyed), Cancel + View Cart (count, total)
// along the bottom. The top bar is passed in.

const MenuScreen = ({
    topBar,
    categories,
    count,
    total,
    onPick,
    onCancel,
    onCart,
}: {
    topBar: React.ReactNode;
    categories: MenuCategory[];
    count: number;
    total: number;
    onPick: (item: MenuItem, categoryCode: string) => void;
    onCancel: () => void;
    onCart: () => void;
}) => {
    const { t } = useTranslation();
    const [activeId, setActiveId] = useState<number | null>(categories[0]?.id ?? null);
    useEffect(() => {
        if (!categories.some((c) => c.id === activeId)) setActiveId(categories[0]?.id ?? null);
    }, [categories, activeId]);
    const active = categories.find((c) => c.id === activeId) ?? categories[0];

    return (
        <div className="flex h-dvh flex-col bg-[#FFF8F0]">
            {topBar}
            <div className="flex min-h-0 flex-1">
                <nav className="w-[30%] max-w-64 shrink-0 overflow-y-auto border-r border-orange-100 bg-[#FBF1E6]">
                    {categories.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setActiveId(c.id)}
                            aria-current={c.id === active?.id}
                            className={`block w-full border-b border-orange-100 px-4 py-7 text-left text-lg font-bold sm:px-6 sm:text-xl ${
                                c.id === active?.id ? 'border-l-[6px] border-l-orange-500 bg-white text-orange-600' : 'text-slate-600'
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </nav>
                <section className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-6">
                    {active && (
                        <>
                            <div className="mb-5 flex items-end justify-between border-b-2 border-slate-200 pb-3">
                                <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{active.name}</h2>
                                <span className="text-sm font-semibold text-slate-400">{t('kiosk.items', { count: active.items.length })}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                                {active.items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={!item.available}
                                        onClick={() => onPick(item, active.code)}
                                        className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-orange-100 transition active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <MenuIcon categoryCode={active.code} imageUrl={item.image_url} />
                                        <span className="mt-1 line-clamp-2 min-h-12 text-lg font-bold leading-snug text-slate-900">{item.name}</span>
                                        <span className="text-xl font-extrabold text-orange-600">{peso(item.price)}</span>
                                        <span
                                            className={`mt-1 w-full rounded-2xl py-2.5 text-base font-bold ring-1 ${
                                                item.available ? 'bg-orange-50 text-orange-600 ring-orange-200' : 'bg-slate-100 text-slate-500 ring-slate-200'
                                            }`}
                                        >
                                            {item.available ? t('kiosk.add') : t('kiosk.soldOut')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-4 border-t border-orange-100 bg-white px-4 py-4 sm:px-6">
                <button type="button" onClick={onCancel} className="rounded-2xl bg-slate-100 py-4 text-xl font-bold text-slate-700 ring-1 ring-slate-200">
                    {t('kiosk.cancel')}
                </button>
                <button
                    type="button"
                    onClick={onCart}
                    className="flex items-center justify-between rounded-2xl bg-orange-500 px-5 py-4 text-xl font-extrabold text-white shadow-lg shadow-orange-500/30"
                >
                    <span className="flex items-center gap-3">
                        <ShoppingCart className="h-6 w-6" />
                        {t('kiosk.viewCart')}
                        <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-base">{count}</span>
                    </span>
                    <span>{peso(total)}</span>
                </button>
            </div>
        </div>
    );
};

export default MenuScreen;
