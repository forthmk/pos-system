// Clock helpers for the kitchen display. Every time is counted from the
// server's clock (now + clockOffset from the live feed), design §7.8.

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** 00:04:16 — a ticket's timer. */
export const hms = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
};

/** 02:14 — Avg Prep. */
export const ms = (seconds: number) => {
    const s = Math.max(0, Math.round(seconds));
    return `${pad(s / 60)}:${pad(s % 60)}`;
};

export const secondsBetween = (from: string, to: number) => (to - Date.parse(from)) / 1000;
