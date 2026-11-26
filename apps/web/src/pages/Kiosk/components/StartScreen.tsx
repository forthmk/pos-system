import { Trans, useTranslation } from 'react-i18next';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { Language } from '@shared/model';
import type { DiningMode } from '../cart';

// UI reference 1: "Where will you be dining?" — IN (eat here, table service)
// or OUT (grab & go, packed bag), and the language. Tapping IN / OUT opens
// the menu. (The "Orders" board button arrives with the live feed, QB-008.)

const LANGUAGES: { code: Language; label: string; native?: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: 'Chinese', native: '中文' },
    { code: 'ko', label: 'Korean', native: '한국어' },
];

const StartScreen = ({ language, onLanguage, onChoose }: { language: Language; onLanguage: (l: Language) => void; onChoose: (m: DiningMode) => void }) => {
    const { t } = useTranslation();
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] px-5 pb-8 pt-6 sm:px-10">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-base font-extrabold tracking-wider text-white">
                    <UtensilsCrossed className="h-5 w-5" /> QUICKBITE
                </span>
            </div>

            <div className="mt-10 flex flex-col items-center text-center">
                <span className="rounded-full bg-orange-100 px-5 py-2 text-sm font-extrabold tracking-[0.2em] text-orange-600">{t('kiosk.selfService')}</span>
                <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">{t('kiosk.whereDining')}</h1>
                <p className="mt-4 text-lg font-medium text-slate-500 sm:text-xl">
                    <Trans
                        i18nKey="kiosk.selectHint"
                        components={{ in: <b className="text-orange-600" />, out: <b className="text-emerald-600" /> }}
                    />
                </p>
            </div>

            <div className="mx-auto mt-10 grid w-full max-w-3xl flex-1 grid-cols-2 gap-5 sm:gap-8">
                <button
                    type="button"
                    onClick={() => onChoose('IN')}
                    className="flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white p-6 shadow-lg shadow-orange-900/5 ring-2 ring-orange-200 transition active:scale-[0.98]"
                >
                    <span className="text-6xl font-extrabold text-orange-600 sm:text-7xl">{t('kiosk.in')}</span>
                    <span className="rounded-full bg-orange-50 px-4 py-1.5 text-sm font-bold text-orange-600 sm:text-base">{t('kiosk.inHint')}</span>
                    <span className="mt-4 flex h-32 w-32 items-center justify-center rounded-full bg-orange-50 text-orange-500 sm:h-40 sm:w-40">
                        <UtensilsCrossed className="h-16 w-16 sm:h-20 sm:w-20" strokeWidth={1.5} />
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => onChoose('OUT')}
                    className="flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white p-6 shadow-lg shadow-emerald-900/5 ring-2 ring-slate-100 transition active:scale-[0.98]"
                >
                    <span className="text-6xl font-extrabold text-slate-900 sm:text-7xl">{t('kiosk.out')}</span>
                    <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700 sm:text-base">{t('kiosk.outHint')}</span>
                    <span className="mt-4 flex h-32 w-32 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 sm:h-40 sm:w-40">
                        <ShoppingBag className="h-16 w-16 sm:h-20 sm:w-20" strokeWidth={1.5} />
                    </span>
                </button>
            </div>

            <div className="mx-auto mt-10 w-full max-w-3xl">
                <p className="mb-3 text-center text-sm font-extrabold tracking-[0.2em] text-slate-400">{t('kiosk.languages')}</p>
                <div className="grid grid-cols-3 gap-3">
                    {LANGUAGES.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            onClick={() => onLanguage(l.code)}
                            aria-pressed={language === l.code}
                            className={`rounded-2xl bg-white px-3 py-4 text-center ring-2 transition ${
                                language === l.code ? 'font-extrabold text-slate-900 ring-orange-400' : 'font-medium text-slate-500 ring-slate-100'
                            }`}
                        >
                            <span className="block text-lg">{l.label}</span>
                            {l.native && <span className="block text-base">{l.native}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
