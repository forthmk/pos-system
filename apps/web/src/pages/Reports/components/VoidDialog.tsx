import { useEffect, useState } from 'react';
import type { AuditRow } from '@shared/model';
import Modal from '../../../components/modals/Modal';
import { money, TENDER_LABEL } from '../format';

/* ──────────────────────────────────────────────────────────────────────────
 * Void + refund a paid order (design decision 16). A manager approves with
 * their own username and PIN (5 wrong PINs lock it for 5 minutes). The
 * order leaves the kitchen and the board; the report counts it as a void;
 * a cash refund comes out of this shift's drawer.
 * ────────────────────────────────────────────────────────────────────────── */

const field = 'mt-1 w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-rose-400';

interface Props {
    row: AuditRow | null;
    busy: boolean;
    error: string;
    onClose: () => void;
    onConfirm: (v: { manager_username: string; manager_pin: string; reason: string }) => void;
}

const VoidDialog = ({ row, busy, error, onClose, onConfirm }: Props) => {
    const [reason, setReason] = useState('');
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    useEffect(() => {
        setReason('');
        setUsername('');
        setPin('');
    }, [row?.order_id]);
    const ready = reason.trim().length >= 3 && username.trim() && pin.length >= 4;

    return (
        <Modal isOpen={!!row} onClose={busy ? () => undefined : onClose} title={row ? `Void ${row.order_no}` : 'Void'}>
            {row && (
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (ready) onConfirm({ manager_username: username.trim(), manager_pin: pin, reason: reason.trim() });
                    }}
                >
                    <div className="rounded-xl bg-rose-50 p-4 text-rose-900 ring-1 ring-rose-200">
                        <p className="font-bold">
                            {money(row.total)} {row.method ? TENDER_LABEL[row.method] : ''} will be refunded.
                        </p>
                        <p className="text-sm">{row.items}</p>
                        {row.method === 'cash' && <p className="mt-1 text-sm">Give the cash back from this drawer — expected cash goes down by the same amount.</p>}
                    </div>
                    <label className="block text-sm font-bold text-slate-700">
                        Reason
                        <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} placeholder="e.g. Wrong item, customer left" className={field} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-bold text-slate-700">
                            Manager username
                            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className={field} />
                        </label>
                        <label className="block text-sm font-bold text-slate-700">
                            Manager PIN
                            <input
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={12}
                                className={`${field} font-mono tracking-widest`}
                            />
                        </label>
                    </div>
                    {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                    <button type="submit" disabled={busy || !ready} className="w-full rounded-xl bg-rose-600 py-3.5 text-lg font-bold text-white disabled:opacity-50">
                        {busy ? 'Voiding…' : 'Void & refund'}
                    </button>
                </form>
            )}
        </Modal>
    );
};

export default VoidDialog;
