import { sql, type Transaction } from 'kysely';
import type { AuditRow, ShiftInfo, ShiftListItem, ShiftReport, TenderLine, ZReadingInfo } from '@pos-system/shared';
import ApiError from '../apiError';
import type { DB } from '../config/database/types.gen';
import { db } from '../services/database.service';
import { toCents } from './pricing';

/* ──────────────────────────────────────────────────────────────────────────
 * Pipeline · reports — Shift Sales & Z-Reading (design §5.7, §7.9).
 *
 *   readReport(shiftId)   the live figures (X-reading) of a shift; for a
 *                         closed shift, also its saved Z-reading
 *   closeShift(...)       counted cash → expected / over-short → shift closed
 *                         and a numbered Z-reading saved (never changed)
 *   listShifts(storeId)   recent shifts for the report's shift picker
 *   shiftCsv(report)      Export CSV / Z-Read: one row per order + totals
 *
 * Sales = orders paid in the shift (orders.shift_id) and not voided. Money is
 * added up in centavos. `summarize` is pure, so the figures are tested
 * without a database.
 *
 * SQL sits in `queries` so tests can swap it.
 * ────────────────────────────────────────────────────────────────────────── */

type Trx = Transaction<DB>;
const iso = (v: unknown) => new Date(v as string).toISOString();
const pesos = (cents: number) => cents / 100;

export const queries = {
    shift: (id: number) =>
        db
            .selectFrom('shifts as s')
            .innerJoin('terminals as t', 't.id', 's.terminal_id')
            .innerJoin('users as u', 'u.id', 's.cashier_id')
            .select([
                's.id',
                's.store_id',
                's.terminal_id',
                's.cashier_id',
                's.status',
                's.opened_at',
                's.closed_at',
                's.opening_cash',
                's.counted_cash',
                't.code as terminal_code',
                'u.name as cashier_name',
            ])
            .where('s.id', '=', id)
            .executeTakeFirst(),
    /** Orders paid in the shift (voided ones too — they're listed as VOID). */
    paidOrders: (shiftId: number) =>
        db
            .selectFrom('orders as o')
            .leftJoin('order_discounts as d', 'd.order_id', 'o.id')
            .leftJoin('discount_types as dt', 'dt.id', 'd.discount_type_id')
            .select([
                'o.id',
                'o.order_no',
                'o.source',
                'o.dining_mode',
                'o.status',
                'o.item_count',
                'o.subtotal',
                'o.vatable_sales',
                'o.vat_amount',
                'o.vat_exempt_sales',
                'o.total_due',
                'o.paid_at',
                'dt.name as discount_name',
            ])
            .where('o.shift_id', '=', shiftId)
            .where('o.paid_at', 'is not', null)
            .where('o.status', 'in', ['preparing', 'completed', 'voided'])
            .orderBy('o.paid_at')
            .orderBy('o.id')
            .execute(),
    payments: (shiftId: number) =>
        db.selectFrom('payments').select(['order_id', 'method', 'amount', 'status', 'reference_no']).where('shift_id', '=', shiftId).where('status', 'in', ['settled', 'refunded']).execute(),
    lines: (orderIds: number[]) =>
        db.selectFrom('order_items').select(['order_id', 'name', 'quantity']).where('order_id', 'in', orderIds).orderBy('id').execute(),
    /** Store sales today until now, and yesterday until the same time. */
    todayVsYesterday: (storeId: number) =>
        db
            .selectFrom('orders')
            .select([
                sql<string | null>`SUM(CASE WHEN paid_at >= CURDATE() THEN total_due END)`.as('today'),
                sql<string | null>`SUM(CASE WHEN paid_at < CURDATE() AND paid_at <= NOW() - INTERVAL 1 DAY THEN total_due END)`.as('yesterday'),
            ])
            .where('store_id', '=', storeId)
            .where('status', 'in', ['preparing', 'completed'])
            .where(sql<boolean>`paid_at >= CURDATE() - INTERVAL 1 DAY`)
            .executeTakeFirstOrThrow(),
    zReading: (shiftId: number) =>
        db
            .selectFrom('z_readings as z')
            .innerJoin('users as u', 'u.id', 'z.generated_by')
            .select(['z.id', 'z.z_number', 'z.generated_at', 'z.grand_total_start', 'z.grand_total_end', 'u.name as generated_by'])
            .where('z.shift_id', '=', shiftId)
            .executeTakeFirst(),
    lastZ: (trx: Trx, terminalId: number) =>
        trx.selectFrom('z_readings').select(['z_number', 'grand_total_end']).where('terminal_id', '=', terminalId).orderBy('z_number', 'desc').limit(1).executeTakeFirst(),
    transaction: <T>(fn: (trx: Trx) => Promise<T>) => db.transaction().execute(fn),
    closeShift: async (trx: Trx, id: number, v: { expected: number; counted: number; overShort: number }) =>
        Number(
            (
                await trx
                    .updateTable('shifts')
                    .set({ status: 'closed', closed_at: sql`NOW()`, expected_cash: v.expected.toFixed(2), counted_cash: v.counted.toFixed(2), over_short: v.overShort.toFixed(2) })
                    .where('id', '=', id)
                    .where('status', '=', 'open')
                    .executeTakeFirst()
            ).numUpdatedRows,
        ),
    insertZ: (trx: Trx, row: Parameters<ReturnType<Trx['insertInto']>['values']>[0]) => trx.insertInto('z_readings').values(row as never).execute(),
    shifts: (storeId: number, cashierId: number | null, limit: number) => {
        let q = db
            .selectFrom('shifts as s')
            .innerJoin('terminals as t', 't.id', 's.terminal_id')
            .innerJoin('users as u', 'u.id', 's.cashier_id')
            .leftJoin('z_readings as z', 'z.shift_id', 's.id')
            .select(['s.id', 's.status', 's.opened_at', 's.closed_at', 't.code as terminal_code', 'u.name as cashier_name', 'z.z_number', sql<string | null>`z.net_sales`.as('net_sales')])
            .where('s.store_id', '=', storeId);
        if (cashierId !== null) q = q.where('s.cashier_id', '=', cashierId);
        return q.orderBy('s.id', 'desc').limit(limit).execute();
    },
};

/* ── the figures (pure) ────────────────────────────────────────────────── */

type Method = TenderLine['method'];
const METHODS: Method[] = ['gcash', 'cash', 'card'];

export interface OrderRow {
    id: number;
    order_no: string;
    source: 'kiosk' | 'pos';
    dining_mode: 'IN' | 'OUT';
    status: string;
    item_count: number;
    subtotal: unknown;
    vatable_sales: unknown;
    vat_amount: unknown;
    vat_exempt_sales: unknown;
    total_due: unknown;
    paid_at: unknown;
    discount_name?: string | null;
}
export interface PaymentRow {
    order_id: number;
    method: Method;
    amount: unknown;
    status: string;
    reference_no?: string | null;
}
export interface LineRow {
    order_id: number;
    name: string;
    quantity: number;
}

const c = (v: unknown) => toCents(Number(v ?? 0));
/** Whole percents that add up to 100 (largest remainder). */
export function sharePercents(values: number[]): number[] {
    const total = values.reduce((a, b) => a + b, 0);
    if (!total) return values.map(() => 0);
    const raw = values.map((v) => (v * 100) / total);
    const floors = raw.map(Math.floor);
    let left = 100 - floors.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - floors[i], i] as const)
        .sort((a, b) => b[0] - a[0])
        .forEach(([, i]) => {
            if (left-- > 0) floors[i] += 1;
        });
    return floors;
}

export const itemsText = (lines: LineRow[]) => lines.map((l) => `${l.quantity}x ${l.name}`).join(', ');

export function summarize(orders: OrderRow[], payments: PaymentRow[], lines: LineRow[], openingCash: number, countedCash: number | null) {
    const sales = orders.filter((o) => o.status !== 'voided');
    const voided = orders.filter((o) => o.status === 'voided');
    const sum = (rows: OrderRow[], f: (o: OrderRow) => unknown) => rows.reduce((a, o) => a + c(f(o)), 0);

    const gross = sum(sales, (o) => o.total_due);
    const subtotal = sum(sales, (o) => o.subtotal);
    const transactions = sales.length;
    const itemsSold = sales.reduce((a, o) => a + Number(o.item_count), 0);

    const voidedIds = new Set(voided.map((o) => o.id));
    const settled = payments.filter((p) => p.status === 'settled' && !voidedIds.has(p.order_id));
    const tenderCents = METHODS.map((m) => settled.filter((p) => p.method === m).reduce((a, p) => a + c(p.amount), 0));
    const shares = sharePercents(tenderCents);

    const cashIn = payments.filter((p) => p.method === 'cash').reduce((a, p) => a + c(p.amount), 0);
    const cashOut = payments.filter((p) => p.method === 'cash' && p.status === 'refunded').reduce((a, p) => a + c(p.amount), 0);
    const expected = toCents(openingCash) + cashIn - cashOut;

    const byOrder = new Map<number, LineRow[]>();
    for (const l of lines) byOrder.set(l.order_id, [...(byOrder.get(l.order_id) ?? []), l]);
    const methodOf = new Map(payments.map((p) => [p.order_id, p.method]));

    const audit: AuditRow[] = [...orders].reverse().map((o) => ({
        order_id: o.id,
        order_no: o.order_no,
        source: o.source,
        dining_mode: o.dining_mode,
        items: itemsText(byOrder.get(o.id) ?? []),
        method: methodOf.get(o.id) ?? null,
        total: pesos(c(o.total_due)),
        status: o.status as AuditRow['status'],
        paid_at: iso(o.paid_at),
    }));

    return {
        gross_sales: pesos(gross),
        transactions,
        in_count: sales.filter((o) => o.dining_mode === 'IN').length,
        out_count: sales.filter((o) => o.dining_mode === 'OUT').length,
        items_sold: itemsSold,
        average_ticket: transactions ? pesos(Math.round(gross / transactions)) : 0,
        items_per_order: transactions ? Math.round((itemsSold / transactions) * 10) / 10 : 0,
        tenders: METHODS.map((method, i) => ({ method, total: pesos(tenderCents[i]), share_pct: shares[i] })),
        subtotal: pesos(subtotal),
        discount_total: pesos(subtotal - gross),
        vatable_sales: pesos(sum(sales, (o) => o.vatable_sales)),
        vat_amount: pesos(sum(sales, (o) => o.vat_amount)),
        vat_exempt_sales: pesos(sum(sales, (o) => o.vat_exempt_sales)),
        voids: { count: voided.length, amount: pesos(sum(voided, (o) => o.total_due)) },
        refunds_amount: pesos(payments.filter((p) => p.status === 'refunded').reduce((a, p) => a + c(p.amount), 0)),
        first_order_no: orders[0]?.order_no ?? null,
        last_order_no: orders[orders.length - 1]?.order_no ?? null,
        cash: {
            opening: openingCash,
            sales: pesos(cashIn),
            refunds: pesos(cashOut),
            expected: pesos(expected),
            counted: countedCash,
            over_short: countedCash === null ? null : pesos(toCents(countedCash) - expected),
        },
        audit,
    };
}

/** (today − yesterday) ÷ yesterday, one decimal; null when yesterday had no sales. */
export const changePct = (today: number, yesterday: number) => (yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 1000) / 10 : null);

/* ── reading ───────────────────────────────────────────────────────────── */

export async function findShift(id: number, storeId: number) {
    const s = await queries.shift(id);
    if (!s || s.store_id !== storeId) throw new ApiError('Shift not found.', 404);
    return s;
}

const toShiftInfo = (s: NonNullable<Awaited<ReturnType<typeof queries.shift>>>): ShiftInfo => ({
    id: s.id,
    terminal_code: s.terminal_code,
    cashier_name: s.cashier_name,
    status: s.status,
    opened_at: iso(s.opened_at),
    closed_at: s.closed_at ? iso(s.closed_at) : null,
    opening_cash: Number(s.opening_cash),
});

const toZ = (z: NonNullable<Awaited<ReturnType<typeof queries.zReading>>>): ZReadingInfo => ({
    id: z.id,
    z_number: z.z_number,
    generated_at: iso(z.generated_at),
    generated_by: z.generated_by,
    grand_total_start: Number(z.grand_total_start),
    grand_total_end: Number(z.grand_total_end),
});

export async function readReport(shiftId: number, storeId: number): Promise<ShiftReport> {
    const s = await findShift(shiftId, storeId);
    const [orders, payments, trend, z] = await Promise.all([queries.paidOrders(s.id), queries.payments(s.id), queries.todayVsYesterday(storeId), queries.zReading(s.id)]);
    const lines = orders.length ? await queries.lines(orders.map((o) => o.id)) : [];
    const figures = summarize(orders, payments as PaymentRow[], lines, Number(s.opening_cash), s.counted_cash === null ? null : Number(s.counted_cash));
    return {
        shift: toShiftInfo(s),
        ...figures,
        vs_yesterday_pct: changePct(Number(trend.today ?? 0), Number(trend.yesterday ?? 0)),
        z_reading: z ? toZ(z) : null,
        server_time: new Date().toISOString(),
    };
}

export async function listShifts(storeId: number, cashierId: number | null, limit = 30): Promise<ShiftListItem[]> {
    return (await queries.shifts(storeId, cashierId, limit)).map((r) => ({
        id: r.id,
        terminal_code: r.terminal_code,
        cashier_name: r.cashier_name,
        status: r.status,
        opened_at: iso(r.opened_at),
        closed_at: r.closed_at ? iso(r.closed_at) : null,
        z_number: r.z_number ?? null,
        net_sales: r.net_sales === null ? null : Number(r.net_sales),
    }));
}

/* ── closing ───────────────────────────────────────────────────────────── */

/**
 * Close Shift (design §5.7): the cashier counts the drawer → expected cash,
 * over / short → the shift closes and its Z-reading is saved with the next
 * number for this register and the running grand total. Two screens closing
 * at once: the second gets 409.
 */
export async function closeShift(input: { shiftId: number; storeId: number; countedCash: number; userId: number }): Promise<ShiftReport> {
    const s = await findShift(input.shiftId, input.storeId);
    if (s.status !== 'open') throw new ApiError('This shift is already closed.', 409, undefined, { code: 'SHIFT_CLOSED' });

    const [orders, payments] = await Promise.all([queries.paidOrders(s.id), queries.payments(s.id)]);
    const f = summarize(orders, payments as PaymentRow[], [], Number(s.opening_cash), input.countedCash);

    await queries.transaction(async (trx) => {
        const closed = await queries.closeShift(trx, s.id, { expected: f.cash.expected, counted: input.countedCash, overShort: f.cash.over_short! });
        if (closed !== 1) throw new ApiError('This shift was just closed on another screen.', 409, undefined, { code: 'SHIFT_CLOSED' });
        const last = await queries.lastZ(trx, s.terminal_id);
        const start = Number(last?.grand_total_end ?? 0);
        await queries.insertZ(trx, {
            shift_id: s.id,
            terminal_id: s.terminal_id,
            z_number: (last?.z_number ?? 0) + 1,
            period_from: s.opened_at,
            period_to: sql`NOW()`,
            transactions: f.transactions,
            in_count: f.in_count,
            out_count: f.out_count,
            items_sold: f.items_sold,
            gross_sales: f.subtotal,
            discount_total: f.discount_total,
            net_sales: f.gross_sales,
            vatable_sales: f.vatable_sales,
            vat_amount: f.vat_amount,
            vat_exempt_sales: f.vat_exempt_sales,
            cash_total: f.tenders.find((t) => t.method === 'cash')!.total,
            gcash_total: f.tenders.find((t) => t.method === 'gcash')!.total,
            card_total: f.tenders.find((t) => t.method === 'card')!.total,
            voids_count: f.voids.count,
            voids_amount: f.voids.amount,
            refunds_amount: f.refunds_amount,
            first_order_no: f.first_order_no,
            last_order_no: f.last_order_no,
            grand_total_start: start,
            grand_total_end: pesos(toCents(start) + toCents(f.gross_sales)),
            generated_by: input.userId,
        });
    });
    return readReport(s.id, input.storeId);
}

/* ── Export CSV / Z-Read ───────────────────────────────────────────────── */

const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const two = (n: number) => String(n).padStart(2, '0');
/** 2026-11-26 21:07 in the server's local time (the store's). */
export const localTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
const money = (n: number) => n.toFixed(2);

/**
 * One row per order (number, time, mode, items, discount, VAT split, tender,
 * reference, total, status), then the shift totals — the same figures the
 * Z-reading saves.
 */
export async function shiftCsv(report: ShiftReport): Promise<string> {
    const orders = await queries.paidOrders(report.shift.id);
    const payments = (await queries.payments(report.shift.id)) as PaymentRow[];
    const lines = orders.length ? await queries.lines(orders.map((o) => o.id)) : [];
    const pay = new Map(payments.map((p) => [p.order_id, p]));
    const items = new Map<number, LineRow[]>();
    for (const l of lines) items.set(l.order_id, [...(items.get(l.order_id) ?? []), l]);

    const rows: unknown[][] = [
        ['Order No', 'Paid At', 'Source', 'Mode', 'Items', 'Subtotal', 'Discount', 'Discount Type', 'VATable Sales', 'VAT', 'VAT-Exempt Sales', 'Total', 'Tender', 'Reference', 'Status'],
        ...orders.map((o) => {
            const p = pay.get(o.id);
            return [
                o.order_no,
                localTime(iso(o.paid_at)),
                o.source === 'kiosk' ? 'Kiosk' : 'POS',
                o.dining_mode,
                itemsText(items.get(o.id) ?? []),
                money(Number(o.subtotal)),
                money(Number(o.subtotal) - Number(o.total_due)),
                o.discount_name ?? '',
                money(Number(o.vatable_sales)),
                money(Number(o.vat_amount)),
                money(Number(o.vat_exempt_sales)),
                money(Number(o.total_due)),
                p ? { gcash: 'GCash', cash: 'Cash', card: 'Card' }[p.method] : '',
                p?.reference_no ?? '',
                o.status === 'voided' ? 'VOID' : 'Paid',
            ];
        }),
        [],
        ['Shift', report.shift.id, 'Terminal', report.shift.terminal_code, 'Cashier', report.shift.cashier_name],
        ['Z-Reading', report.z_reading ? `Z-${String(report.z_reading.z_number).padStart(4, '0')}` : 'not closed yet (X-reading)'],
        ['Opened', localTime(report.shift.opened_at), 'Closed', report.shift.closed_at ? localTime(report.shift.closed_at) : ''],
        ['Transactions', report.transactions, 'IN', report.in_count, 'OUT', report.out_count, 'Items sold', report.items_sold],
        ['Sales before discounts', money(report.subtotal)],
        ['Discounts & VAT exemption', money(report.discount_total)],
        ['Gross shift sales', money(report.gross_sales)],
        ['VATable sales', money(report.vatable_sales), 'VAT', money(report.vat_amount), 'VAT-exempt sales', money(report.vat_exempt_sales)],
        ...report.tenders.map((t) => [`${{ gcash: 'GCash', cash: 'Cash', card: 'Card' }[t.method]} total`, money(t.total), `${t.share_pct}%`]),
        ['Voids', report.voids.count, money(report.voids.amount), 'Refunds', money(report.refunds_amount)],
        ['First order', report.first_order_no ?? '', 'Last order', report.last_order_no ?? ''],
        ['Opening cash', money(report.cash.opening), 'Expected cash', money(report.cash.expected), 'Counted cash', report.cash.counted === null ? '' : money(report.cash.counted), 'Over / short', report.cash.over_short === null ? '' : money(report.cash.over_short)],
        ...(report.z_reading ? [['Grand total start', money(report.z_reading.grand_total_start), 'Grand total end', money(report.z_reading.grand_total_end)]] : []),
    ];
    return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
