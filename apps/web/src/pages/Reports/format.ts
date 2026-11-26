import type { TenderLine } from '@shared/model';

// Formats for the Shift Sales & Z-Reading report (₱14,820.00 — always 2 decimals, like the mock-up).

export const money = (n: number) => `${n < 0 ? '−' : ''}₱${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const TENDER_LABEL: Record<TenderLine['method'], string> = { gcash: 'GCash', cash: 'Cash', card: 'Card' };

export const zLabel = (n: number) => `Z-${String(n).padStart(4, '0')}`;

export const dateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const time = (iso: string) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
