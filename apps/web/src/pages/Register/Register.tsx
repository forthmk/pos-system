import { useMemo, useReducer, useState } from 'react';
import { CircleAlert, CircleCheck, Clock, Lock } from 'lucide-react';
import type { KioskQueueItem, MenuItem, OrderSummary, ScanResult } from '@shared/model';
import { parseSlipCode } from '@shared/utils';
import {
    useCheckVoucher,
    useCurrentShift,
    useDiscountTypes,
    useKioskQueue,
    useNextNumber,
    useOpenShift,
    usePlaceOrder,
    usePosMenu,
    useReleaseOrder,
    useScanSlip,
    useSettleOrder,
} from '../../hooks/api/usePos';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useScannerInput } from '../../hooks/useScannerInput';
import { LoadingState } from '../../components/ui/Progress';
import { friendlyError } from '../../utils/friendlyError';
import { printReceipt } from '../../utils/printReceipt';
import { uuid } from '../../utils/uuid';
import ActionBar from './components/ActionBar';
import { DiscountDialog, ExtrasDialog, KioskQueuePanel, OpenShiftDialog, SettledDialog } from './components/Dialogs';
import MenuPanel from './components/MenuPanel';
import ReceiptPanel from './components/ReceiptPanel';
import { discountInput, discountLabel, emptyTicket, readTicket, ticketReducer } from './ticket';

/* ──────────────────────────────────────────────────────────────────────────
 * Cashier Register — Menu & Order Entry (design §5.3–5.4, §5.7, §5.10, UI
 * reference "Cashier Register"). A shift must be open first. The cashier
 * rings up a walk-in ticket from the menu, or scans a kiosk slip (the order
 * comes in by itself), picks IN / OUT, a discount and the tender, and presses
 * PROCEED: the order is paid and goes to the kitchen; the receipt prints.
 * ────────────────────────────────────────────────────────────────────────── */

type Notice = { tone: 'info' | 'warn' | 'error'; title: string; text?: string } | null;

const Register = () => {
    const { principal } = useAuth();
    const terminalCode = principal?.kind === 'staff' ? (principal.terminal?.code ?? '—') : '—';
    const cashierName = principal?.kind === 'staff' ? principal.name : '';

    const menu = usePosMenu();
    const shift = useCurrentShift();
    const openShift = useOpenShift();
    const types = useDiscountTypes();
    const nextNumber = useNextNumber();
    const queue = useKioskQueue();
    const scan = useScanSlip();
    const release = useReleaseOrder();
    const placeOrder = usePlaceOrder();
    const settle = useSettleOrder();
    const checkVoucher = useCheckVoucher();
    const { confirm, confirmDialog } = useConfirm();

    const [ticket, dispatch] = useReducer(ticketReducer, emptyTicket);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState<Notice>(null);
    const [shiftError, setShiftError] = useState('');
    const [extrasFor, setExtrasFor] = useState<MenuItem | null>(null);
    const [discountFor, setDiscountFor] = useState<'SENIOR' | 'PWD' | 'VOUCHER' | null>(null);
    const [queueOpen, setQueueOpen] = useState(false);
    const [settled, setSettled] = useState<OrderSummary | null>(null);

    const { lines, priced } = readTicket(ticket, menu.data?.categories, types.data);
    const rateLabel = discountLabel(ticket.discount, types.data);
    const onTicket = useMemo(() => {
        const m = new Map<number, number>();
        for (const l of ticket.lines) m.set(l.menu_item_id, (m.get(l.menu_item_id) ?? 0) + l.quantity);
        return m;
    }, [ticket.lines]);

    const print = (order: OrderSummary) => void printReceipt(order, { storeName: 'QUICKBITE #01', terminalCode, cashierName }).catch(() => undefined);

    /* ── scanning a kiosk slip ─────────────────────────────────────────── */

    const showScan = (r: ScanResult) => {
        if (r.result === 'ready') {
            dispatch({ type: 'scanned', order: r.order, lockedUntil: r.locked_until });
            setNotice(null);
        } else if (r.result === 'already_paid') setNotice({ tone: 'info', title: `${r.order_no} is already paid`, text: 'Nothing to charge.' });
        else if (r.result === 'in_use') setNotice({ tone: 'warn', title: `${r.order_no} is being processed at ${r.terminal}` });
        else if (r.result === 'voided') setNotice({ tone: 'error', title: `${r.order_no} was voided` });
        else setNotice({ tone: 'warn', title: `${r.order.order_no} expired`, text: 'It wasn’t paid in time and was cancelled. Ring it up again as a new order.' });
    };

    const lookUp = async (raw: string) => {
        setError('');
        if (!parseSlipCode(raw)) return setNotice({ tone: 'error', title: 'That code can’t be read', text: 'Scan again, or pick the order from the Kiosk # list.' });
        if (ticket.lines.length > 0 && !(await confirm({ title: 'Replace the current ticket?', description: 'The items rung up so far will be cleared.', confirmLabel: 'Replace', tone: 'danger' }))) return;
        try {
            if (ticket.scanned) await release.mutateAsync(ticket.scanned.order.id).catch(() => undefined);
            showScan(await scan.mutateAsync(raw));
        } catch (e) {
            setNotice({ tone: 'error', title: friendlyError(e, 'Could not look up that slip.') });
        }
    };
    useScannerInput({ onScan: (code) => void lookUp(code), enabled: !settled && !discountFor && !extrasFor });

    /* ── ticket actions ────────────────────────────────────────────────── */

    const pick = (item: MenuItem) => {
        if (ticket.scanned) return setNotice({ tone: 'info', title: 'This is a scanned kiosk order', text: 'CLEAR it first to ring up a new ticket.' });
        if (item.addons.length) setExtrasFor(item);
        else dispatch({ type: 'add', menu_item_id: item.id, addon_ids: [], quantity: 1 });
    };

    const toggleDiscount = (code: 'PWD' | 'VOUCHER' | 'STUDENT' | 'SENIOR') => {
        setError('');
        if (ticket.discount?.type === code) return dispatch({ type: 'discount', discount: null });
        if (code === 'STUDENT') return dispatch({ type: 'discount', discount: { type: 'STUDENT' } });
        setDiscountFor(code);
    };

    const clear = async () => {
        if (ticket.scanned) await release.mutateAsync(ticket.scanned.order.id).catch(() => undefined);
        dispatch({ type: 'clear' });
        setError('');
        setNotice(null);
    };

    const tenderReady =
        lines.length > 0 &&
        !lines.some((l) => l.unavailable) &&
        (ticket.method === 'cash' ? Number(ticket.tendered || 0) >= priced.total_due : ticket.reference.trim().length >= 6);

    const proceed = async () => {
        setError('');
        const payment =
            ticket.method === 'cash' ? { method: 'cash' as const, tendered: Number(ticket.tendered) } : { method: ticket.method, reference_no: ticket.reference.trim() };
        try {
            let order: OrderSummary;
            if (ticket.scanned) {
                order = await settle.mutateAsync({ orderId: ticket.scanned.order.id, body: { discount: discountInput(ticket.discount), payment } });
            } else {
                const clientRef = ticket.clientRef ?? uuid();
                dispatch({ type: 'clientRef', value: clientRef });
                order = await placeOrder.mutateAsync({
                    client_ref: clientRef,
                    dining_mode: ticket.mode,
                    lines: ticket.lines.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity, addon_ids: l.addon_ids })),
                    discount: discountInput(ticket.discount),
                    payment,
                });
            }
            setSettled(order);
            print(order);
            dispatch({ type: 'clear' });
        } catch (e) {
            const code = (e as { response?: { data?: { details?: { code?: string } } } })?.response?.data?.details?.code;
            if (code === 'NO_OPEN_SHIFT') void shift.refetch();
            if (code === 'ITEM_UNAVAILABLE') void menu.refetch();
            setError(friendlyError(e, 'Could not save the order. Please try again.'));
        }
    };

    if (menu.isLoading || shift.isLoading) return <LoadingState fullPage label="Opening the register…" />;

    return (
        <div className="mx-auto max-w-[1400px] space-y-4 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900">Cashier Register — Menu &amp; Order Entry</h1>
                    {shift.data && (
                        <p className="text-sm text-slate-500">
                            Shift open since {new Date(shift.data.opened_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} · {shift.data.cashier_name} · starting
                            cash ₱{shift.data.opening_cash.toLocaleString('en-PH')}
                        </p>
                    )}
                </div>
                {notice && (
                    <div
                        role="status"
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm ring-1 ${
                            notice.tone === 'info' ? 'bg-sky-50 text-sky-800 ring-sky-200' : notice.tone === 'warn' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
                        }`}
                    >
                        {notice.tone === 'info' ? <CircleCheck className="h-4 w-4" /> : notice.tone === 'warn' ? <Clock className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                        <span className="font-bold">{notice.title}</span>
                        {notice.text && <span>{notice.text}</span>}
                        <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="ml-1 font-bold">
                            ×
                        </button>
                    </div>
                )}
            </div>

            <div className="grid gap-4 lg:h-[calc(100dvh-15rem)] lg:grid-cols-[1fr_440px]">
                <MenuPanel categories={menu.data?.categories ?? []} onTicket={onTicket} onPick={pick} />
                <ReceiptPanel
                    ticket={ticket}
                    lines={lines}
                    priced={priced}
                    orderNo={nextNumber.data?.order_no ?? 'ORD-…'}
                    terminalCode={terminalCode}
                    rateLabel={rateLabel}
                    error={error}
                    onQuantity={(key, quantity) => dispatch({ type: 'quantity', key, quantity })}
                    onTendered={(value) => dispatch({ type: 'tendered', value })}
                    onReference={(value) => dispatch({ type: 'reference', value })}
                />
            </div>

            <ActionBar
                ticket={ticket}
                canProceed={tenderReady}
                proceeding={placeOrder.isPending || settle.isPending}
                latestKiosk={queue.data?.length ? queue.data[queue.data.length - 1].display_no : null}
                waiting={queue.data?.length ?? 0}
                onMode={(mode) => (ticket.scanned ? setNotice({ tone: 'info', title: 'IN / OUT was chosen on the kiosk' }) : dispatch({ type: 'mode', mode }))}
                onDiscount={toggleDiscount}
                onMethod={(method) => dispatch({ type: 'method', method })}
                onClear={() => void clear()}
                onProceed={() => void proceed()}
                onKiosk={() => setQueueOpen(true)}
            />
            {ticket.scanned && (
                <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Lock className="h-3 w-3" /> Kiosk prices are kept for a scanned order.
                </p>
            )}

            <OpenShiftDialog
                open={!shift.data && !shift.isLoading}
                terminalCode={terminalCode}
                busy={openShift.isPending}
                error={shiftError}
                onOpen={async (cash) => {
                    setShiftError('');
                    try {
                        await openShift.mutateAsync({ opening_cash: cash });
                    } catch (e) {
                        setShiftError(friendlyError(e, 'Could not open the shift.'));
                    }
                }}
            />
            <ExtrasDialog
                item={extrasFor}
                onClose={() => setExtrasFor(null)}
                onAdd={(quantity, addon_ids) => {
                    dispatch({ type: 'add', menu_item_id: extrasFor!.id, addon_ids, quantity });
                    setExtrasFor(null);
                }}
            />
            <DiscountDialog
                kind={discountFor}
                subtotal={priced.subtotal}
                onClose={() => setDiscountFor(null)}
                checkVoucher={(code, subtotal) => checkVoucher.mutateAsync({ code, subtotal })}
                onApply={(discount) => {
                    dispatch({ type: 'discount', discount });
                    setDiscountFor(null);
                }}
            />
            <KioskQueuePanel
                open={queueOpen}
                items={queue.data ?? []}
                onClose={() => setQueueOpen(false)}
                onPick={(o: KioskQueueItem) => {
                    setQueueOpen(false);
                    if (o.slip_code) void lookUp(o.slip_code);
                }}
            />
            <SettledDialog order={settled} onPrint={() => settled && print(settled)} onNext={() => setSettled(null)} />
            {confirmDialog}
        </div>
    );
};

export default Register;
