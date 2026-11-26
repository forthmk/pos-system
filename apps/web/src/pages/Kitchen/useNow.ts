import { useEffect, useState } from 'react';

/** The server's "now" (ms), ticking every second — drives the ticket timers and the clock. */
export function useNow(clockOffset: number) {
    const [now, setNow] = useState(() => Date.now() + clockOffset);
    useEffect(() => {
        setNow(Date.now() + clockOffset);
        const id = setInterval(() => setNow(Date.now() + clockOffset), 1000);
        return () => clearInterval(id);
    }, [clockOffset]);
    return now;
}
