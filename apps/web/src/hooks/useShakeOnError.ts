import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

// Shakes a field when the user presses Submit while it's still invalid
// (e.g. a required field left empty) — every submit, not while typing.
// Returns the class to put on the field's wrapper (see .field-shake in
// tailwind.css). Must be used inside <Form> (react-hook-form context).
export function useShakeOnError(hasError: boolean): string {
    const {
        formState: { submitCount },
    } = useFormContext();
    const [shaking, setShaking] = useState(false);

    useEffect(() => {
        if (submitCount === 0 || !hasError) return;
        setShaking(true);
        const t = window.setTimeout(() => setShaking(false), 450);
        return () => window.clearTimeout(t);
        // Only a new submit attempt triggers it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitCount]);

    return shaking ? 'field-shake' : '';
}
