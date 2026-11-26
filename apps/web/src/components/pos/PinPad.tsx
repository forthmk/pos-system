import { useEffect } from 'react';
import { Delete } from 'lucide-react';

// Big-button PIN entry for touch screens (register, kitchen display). The
// physical keyboard works too: digits, Backspace, Enter (= onSubmit).
// The PIN is shown as dots only.

interface PinPadProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    maxLength?: number;
    disabled?: boolean;
    /** Class from useShakeOnError, to shake the dots on a wrong PIN. */
    shakeClassName?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

const PinPad = ({ value, onChange, onSubmit, maxLength = 6, disabled, shakeClassName = '' }: PinPadProps) => {
    const press = (key: (typeof KEYS)[number]) => {
        if (disabled) return;
        if (key === 'clear') onChange('');
        else if (key === 'back') onChange(value.slice(0, -1));
        else if (value.length < maxLength) onChange(value + key);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Typing in a text box (the username) is not PIN entry.
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
            if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
            else if (e.key === 'Backspace') press('back');
            else if (e.key === 'Enter') onSubmit?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className="flex flex-col items-center gap-5">
            <div className={`flex h-6 items-center gap-3 ${shakeClassName}`} aria-label={`${value.length} digits entered`} role="status">
                {Array.from({ length: Math.max(4, Math.min(maxLength, value.length + 1)) }, (_, i) => (
                    <span
                        key={i}
                        className={`h-4 w-4 rounded-full border-2 transition-colors ${
                            i < value.length ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-transparent'
                        }`}
                    />
                ))}
            </div>
            <div className="grid w-full max-w-xs grid-cols-3 gap-3">
                {KEYS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => press(key)}
                        aria-label={key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear PIN' : key}
                        className={`flex h-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-sm ring-1 transition active:scale-95 disabled:opacity-50 ${
                            key === 'clear' || key === 'back'
                                ? 'bg-slate-50 text-base font-semibold text-slate-500 ring-slate-200 hover:bg-slate-100'
                                : 'bg-white text-slate-900 ring-slate-200 hover:bg-orange-50 hover:ring-orange-200'
                        }`}
                    >
                        {key === 'back' ? <Delete className="h-6 w-6" /> : key === 'clear' ? 'Clear' : key}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PinPad;
