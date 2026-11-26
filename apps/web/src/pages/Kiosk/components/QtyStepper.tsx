import { useTranslation } from 'react-i18next';
import { MAX_QTY } from '../cart';

// − qty + as in the UI references (item screen and cart lines).
const QtyStepper = ({ value, min = 1, onChange, size = 'lg' }: { value: number; min?: number; onChange: (v: number) => void; size?: 'md' | 'lg' }) => {
    const { t } = useTranslation();
    const btn = size === 'lg' ? 'h-16 w-16 text-3xl' : 'h-12 w-12 text-2xl';
    return (
        <div className="flex items-center gap-4">
            <button
                type="button"
                aria-label={t('kiosk.decreaseOne')}
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min && min > 0}
                className={`${btn} flex items-center justify-center rounded-2xl bg-white font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 active:scale-95 disabled:opacity-40`}
            >
                −
            </button>
            <span className={`min-w-14 border-b-[3px] border-slate-900 text-center font-extrabold tabular-nums ${size === 'lg' ? 'text-4xl' : 'text-2xl'}`}>
                {value}
            </span>
            <button
                type="button"
                aria-label={t('kiosk.increaseOne')}
                onClick={() => onChange(Math.min(MAX_QTY, value + 1))}
                disabled={value >= MAX_QTY}
                className={`${btn} flex items-center justify-center rounded-2xl bg-orange-500 font-bold text-white shadow-sm active:scale-95 disabled:opacity-40`}
            >
                +
            </button>
        </div>
    );
};

export default QtyStepper;
