// Helpers for 'YYYY-MM-DD' calendar dates (e.g. a PO's exp_delivery_date).
// Parsed as a LOCAL date: new Date('2026-10-01') is UTC midnight, which is
// the previous day for anyone in a timezone behind UTC.

export const formatDateOnly = (value: string | null | undefined): string => {
    if (!value) return '—';
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Today as 'YYYY-MM-DD' in local time — the earliest pickable delivery date.
export const todayDateOnly = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// 'YYYY-MM-DD' → a local Date at midnight (undefined for anything else), and
// back — what the DatePicker calendar works in.
export const fromDateOnly = (value?: string | null): Date | undefined => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
};

export const toDateOnly = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
