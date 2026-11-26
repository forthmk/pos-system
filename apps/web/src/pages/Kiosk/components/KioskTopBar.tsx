import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import type { Language } from '@shared/model';
import type { DiningMode } from '../cart';

// Menu top bar (UI reference 2): QUICKBITE · "IN • Dine-In ⇄" (tap to switch)
// · EN / 中文 / 한국 · cart with its count.

export const LANGUAGE_SHORT: Record<Language, string> = { en: 'EN', zh: '中文', ko: '한국' };

const KioskTopBar = ({
    mode,
    language,
    count,
    onToggleMode,
    onLanguage,
    onCart,
}: {
    mode: DiningMode;
    language: Language;
    count: number;
    onToggleMode: () => void;
    onLanguage: (l: Language) => void;
    onCart: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-between gap-2 border-b border-orange-100 bg-[#FFF8F0] px-3 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-extrabold tracking-wider text-white sm:flex">
                    <UtensilsCrossed className="h-4 w-4" /> QUICKBITE
                </span>
                <button
                    type="button"
                    onClick={onToggleMode}
                    aria-label={t('kiosk.switchMode')}
                    className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600 ring-1 ring-orange-200"
                >
                    {mode === 'IN' ? `${t('kiosk.in')} • ${t('kiosk.dineIn')}` : `${t('kiosk.out')} • ${t('kiosk.takeOut')}`}
                    <ArrowLeftRight className="h-4 w-4" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
                    {(Object.keys(LANGUAGE_SHORT) as Language[]).map((l) => (
                        <button
                            key={l}
                            type="button"
                            onClick={() => onLanguage(l)}
                            aria-pressed={language === l}
                            className={`rounded-full px-3 py-1.5 text-sm font-bold ${language === l ? 'bg-orange-500 text-white' : 'text-slate-500'}`}
                        >
                            {LANGUAGE_SHORT[l]}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={onCart}
                    aria-label={t('kiosk.viewCart')}
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200"
                >
                    <ShoppingCart className="h-6 w-6 text-slate-800" />
                    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                        {count}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default KioskTopBar;
