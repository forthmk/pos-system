import { useEffect, useState } from 'react';
import { Check, CircleCheck, Clock, Printer } from 'lucide-react';
import type { KioskQueueItem, MenuItem, OrderSummary, VoucherCheck } from '@shared/model';
import Modal from '../../../components/modals/Modal';
import SidePanel from '../../../components/common/SidePanel';
import { friendlyError } from '../../../utils/friendlyError';
import { peso } from '../../Kiosk/cart';
import type { TicketDiscount } from '../ticket';

// The register's dialogs: open shift, Senior / PWD / Voucher details, extras
// picker, the Kiosk # list and Payment Settled (design §5.3–5.4, §5.7).

const field = 'w-full rounded-xl bg-white px-4 py-3 text-lg ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-400';
const primary = 'w-full rounded-xl bg-orange-500 py-3.5 text-lg font-bold text-white disabled:opacity-50';

/* ── open shift (design §5.7) ──────────────────────────────────────────── */

export const OpenShiftDialog = ({ open, terminalCode, busy, error, onOpen }: { open: boolean; terminalCode: string; busy: boolean; error: string; onOpen: (cash: number) => void }) => {
    const [cash, setCash] = useState('');
    return (
        <Modal isOpen={open} onClose={() => undefined} title={`Open a shift on ${terminalCode}`}>
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    onOpen(Number(cash || 0));
                }}
            >
                <p className="text-slate-600">Count the cash in the drawer before the first sale. It is your starting cash for this shift.</p>
                <label className="block font-bold text-slate-700">
                    Starting cash (₱)
                    <input autoFocus value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="2000.00" className={`${field} mt-1 font-mono`} />
                </label>
                {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                <button type="submit" disabled={busy} className={primary}>
                    {busy ? 'Opening…' : 'Open shift'}
                </button>
            </form>
        </Modal>
    );
};

/* ── Senior / PWD ID, voucher code (design §7.5, decisions 11–12) ──────── */

export const DiscountDialog = ({
    kind,
    subtotal,
    onApply,
    onClose,
    checkVoucher,
}: {
    kind: 'SENIOR' | 'PWD' | 'VOUCHER' | null;
    subtotal: number;
    onApply: (d: TicketDiscount) => void;
    onClose: () => void;
    checkVoucher: (code: string, subtotal: number) => Promise<VoucherCheck>;
}) => {
    const [idNumber, setIdNumber] = useState('');
    const [name, setName] = useState('');
    const [diners, setDiners] = useState(1);
    const [qualified, setQualified] = useState(1);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // A new dialog starts empty (design: modals re-seed when they open).
        setIdNumber('');
        setName('');
        setDiners(1);
        setQualified(1);
        setCode('');
        setError('');
    }, [kind]);

    const submit = async () => {
        setError('');
        if (kind === 'VOUCHER') {
            setBusy(true);
            try {
                const voucher = await checkVoucher(code, subtotal);
                onApply({ type: 'VOUCHER', code: voucher.code, voucher });
            } catch (e) {
                setError(friendlyError(e, 'Could not check that voucher.'));
            } finally {
                setBusy(false);
            }
            return;
        }
        if (idNumber.trim().length < 4) return setError(`Type the ${kind} ID number.`);
        if (!name.trim()) return setError(`Type the name on the ${kind} ID.`);
        if (qualified > diners) return setError('More qualified diners than diners.');
        onApply({ type: kind!, id_number: idNumber.trim(), holder_name: name.trim(), diners, qualified });
    };

    return (
        <Modal isOpen={!!kind} onClose={onClose} title={kind === 'VOUCHER' ? 'Voucher' : `${kind === 'SENIOR' ? 'Senior citizen' : 'PWD'} discount`}>
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                {kind === 'VOUCHER' ? (
                    <label className="block font-bold text-slate-700">
                        Voucher code
                        <input autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={40} className={`${field} mt-1 font-mono`} />
                    </label>
                ) : (
                    <>
                        <p className="text-sm text-slate-500">12% VAT is removed, then 20% off. The ID number and name are kept on the order.</p>
                        <label className="block font-bold text-slate-700">
                            ID number
                            <input autoFocus value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={40} className={`${field} mt-1 font-mono`} />
                        </label>
                        <label className="block font-bold text-slate-700">
                            Name on the ID
                            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${field} mt-1`} />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block font-bold text-slate-700">
                                Diners on this order
                                <input type="number" min={1} max={50} value={diners} onChange={(e) => setDiners(Math.max(1, Number(e.target.value)))} className={`${field} mt-1`} />
                            </label>
                            <label className="block font-bold text-slate-700">
                                {kind === 'SENIOR' ? 'Seniors' : 'PWDs'} among them
                                <input type="number" min={1} max={50} value={qualified} onChange={(e) => setQualified(Math.max(1, Number(e.target.value)))} className={`${field} mt-1`} />
                            </label>
                        </div>
                    </>
                )}
                {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
                <button type="submit" disabled={busy} className={primary}>
                    {busy ? 'Checking…' : 'Apply discount'}
                </button>
            </form>
        </Modal>
    );
};

/* ── extras picker (design decision 13) ────────────────────────────────── */

export const ExtrasDialog = ({ item, onAdd, onClose }: { item: MenuItem | null; onAdd: (quantity: number, addonIds: number[]) => void; onClose: () => void }) => {
    const [picked, setPicked] = useState<number[]>([]);
    const [quantity, setQuantity] = useState(1);
    useEffect(() => {
        setPicked([]);
        setQuantity(1);
    }, [item?.id]);
    if (!item) return null;
    const unit = item.price + item.addons.filter((a) => picked.includes(a.id)).reduce((s, a) => s + a.price, 0);
    return (
        <Modal isOpen onClose={onClose} title={`${item.sku} · ${item.name}`}>
            <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Add extras / sides</p>
                <div className="grid grid-cols-2 gap-2">
                    {item.addons.map((a) => {
                        const on = picked.includes(a.id);
                        return (
                            <button
                                key={a.id}
                                type="button"
                                disabled={!a.available}
                                aria-pressed={on}
                                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                                className={`flex items-center justify-between rounded-xl px-3 py-3 text-left ring-2 disabled:opacity-40 ${on ? 'bg-orange-50 ring-orange-500' : 'ring-slate-100'}`}
                            >
                                <span>
                                    <span className="block font-bold">{a.name}</span>
                                    <span className="text-sm font-bold text-orange-600">{a.available ? `+${peso(a.price)}` : 'Sold out'}</span>
                                </span>
                                {on && <Check className="h-5 w-5 text-orange-600" />}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center justify-center gap-4">
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-12 w-12 rounded-xl text-2xl font-bold ring-1 ring-slate-200">
                        −
                    </button>
                    <span className="w-10 text-center font-mono text-2xl font-bold">{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="h-12 w-12 rounded-xl bg-slate-900 text-2xl font-bold text-white">
                        +
                    </button>
                </div>
                <button type="button" onClick={() => onAdd(quantity, picked)} className={`${primary} flex items-center justify-between px-5`}>
                    Add to ticket <span>{peso(Math.round(unit * quantity * 100) / 100)}</span>
                </button>
            </div>
        </Modal>
    );
};

/* ── Kiosk # list (design §5.4) ────────────────────────────────────────── */

export const KioskQueuePanel = ({ open, items, onPick, onClose }: { open: boolean; items: KioskQueueItem[]; onPick: (item: KioskQueueItem) => void; onClose: () => void }) =>
    open ? (
        <SidePanel title="Kiosk orders waiting" subtitle="Tap one when the customer has no slip" onClose={onClose}>
            {items.length === 0 ? (
                <p className="py-10 text-center text-slate-400">No kiosk order is waiting for payment.</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((o) => (
                        <li key={o.id}>
                            <button
                                type="button"
                                disabled={!o.slip_code}
                                onClick={() => onPick(o)}
                                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ring-1 ring-slate-200 hover:ring-orange-300"
                            >
                                <span>
                                    <span className="block font-mono text-xl font-extrabold">{o.display_no}</span>
                                    <span className="flex items-center gap-1 text-sm text-slate-500">
                                        <Clock className="h-3.5 w-3.5" />
                                        {new Date(o.placed_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} · {o.dining_mode} · {o.item_count} items
                                        {o.locked_by && ` · at ${o.locked_by}`}
                                    </span>
                                </span>
                                <span className="font-mono text-lg font-bold text-orange-600">{peso(o.total_due)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </SidePanel>
    ) : null;

/* ── Payment Settled (UI reference) ────────────────────────────────────── */

export const SettledDialog = ({ order, onPrint, onNext }: { order: OrderSummary | null; onPrint: () => void; onNext: () => void }) => {
    if (!order) return null;
    const pay = order.payment;
    const rows: [string, React.ReactNode][] = [
        ['Dining Mode:', order.dining_mode === 'IN' ? 'IN (Dine-In)' : 'OUT (Take-Out)'],
        ['Payment Tender:', <span className="text-sky-600">{pay?.method === 'gcash' ? 'GCash' : pay?.method === 'card' ? 'Card' : 'Cash'}</span>],
        ...(order.discount ? ([['Discount:', `${order.discount.label} −₱${(order.discount.amount + order.discount.vat_removed).toFixed(2)}`]] as [string, string][]) : []),
        ['Total Charged:', <span className="font-mono">₱{order.total_due.toFixed(2)}</span>],
        ...(pay?.change_due !== null && pay?.change_due !== undefined ? ([['Change:', <span className="font-mono text-emerald-700">₱{pay.change_due.toFixed(2)}</span>]] as [string, React.ReactNode][]) : []),
    ];
    return (
        <Modal isOpen onClose={onNext} title="Payment">
            <div className="flex flex-col items-center text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CircleCheck className="h-11 w-11" />
                </span>
                <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Payment Settled</h2>
                <p className="font-semibold text-slate-500">{order.order_no} • Sent to Kitchen KDS</p>
                <dl className="mt-5 w-full space-y-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-left">
                    {rows.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                            <dt className="text-slate-500">{k}</dt>
                            <dd className="font-bold text-slate-900">{v}</dd>
                        </div>
                    ))}
                </dl>
                <button type="button" onClick={onPrint} className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-slate-700 ring-1 ring-slate-200">
                    <Printer className="h-4 w-4" /> Print receipt again
                </button>
                <button type="button" autoFocus onClick={onNext} className="mt-4 w-full rounded-xl bg-slate-900 py-4 text-lg font-extrabold text-white">
                    Next Customer
                </button>
            </div>
        </Modal>
    );
};
