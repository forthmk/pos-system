import { useState, useEffect } from 'react';

export function useDebounce(value: any, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // If value changes before the delay is up, this clears the previous timeout
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}
