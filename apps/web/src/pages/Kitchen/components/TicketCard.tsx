import { forwardRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, Clock, GripVertical, RotateCcw } from 'lucide-react';
import type { KdsTicket } from '@shared/model';
import { hms, secondsBetween } from '../time';

/* ──────────────────────────────────────────────────────────────────────────
 * One kitchen ticket (UI reference "Kitchen Display", design §7.8): green ✓,
 * IN / OUT, the order number in red, qty × name with extras underneath, and
 * the timer.
 *   Pending:   orange bar, timer running; red bar + red timer after
 *              `kds_delay_minutes`. "⠿ Drag or Tap ✓".
 *   Completed: green bar, timer frozen at the prep time. "Served", and
 *              Recall while still within `kds_recall_minutes`.
 * ────────────────────────────────────────────────────────────────────────── */

interface Props {
    ticket: KdsTicket;
    now: number;
    delayMinutes: number;
    recallMinutes: number;
    onComplete?: () => void;
    onRecall?: () => void;
    /** Start dragging (mouse: whole card; finger: the handle). */
    onDragStart?: (e: ReactPointerEvent<HTMLElement>, fromHandle: boolean) => void;
    dimmed?: boolean;
    floating?: boolean;
    fresh?: boolean;
}

const TicketCard = forwardRef<HTMLDivElement, Props>(
    ({ ticket, now, delayMinutes, recallMinutes, onComplete, onRecall, onDragStart, dimmed, floating, fresh }, ref) => {
        const done = ticket.status === 'completed';
        const seconds = done && ticket.completed_at ? secondsBetween(ticket.sent_to_kitchen_at, Date.parse(ticket.completed_at)) : secondsBetween(ticket.sent_to_kitchen_at, now);
        const late = !done && seconds > delayMinutes * 60;
        const canRecall = done && !!ticket.completed_at && secondsBetween(ticket.completed_at, now) < recallMinutes * 60;
        // `!`: darwin-ui's stylesheet sets every border colour outside Tailwind's
        // layers, which would beat a plain border-colour class.
        const bar = done ? 'border-t-green-700!' : late ? 'border-t-red-600!' : 'border-t-amber-500!';

        return (
            <div
                ref={ref}
                data-order={ticket.order_id}
                onPointerDown={!done && onDragStart ? (e) => e.pointerType === 'mouse' && onDragStart(e, false) : undefined}
                className={`flex flex-col rounded-xl border-t-[6px] ${bar} ${done ? 'bg-slate-50' : 'bg-white'} p-5 shadow-sm ring-1 ring-slate-200 transition sm:p-6 ${
                    !done && onDragStart ? 'cursor-grab' : ''
                } ${dimmed ? 'opacity-30' : ''} ${floating ? 'rotate-1 cursor-grabbing shadow-2xl ring-2 ring-green-500' : ''} ${fresh ? 'animate-[pulse_1s_ease-in-out_3]' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={done ? undefined : onComplete}
                        disabled={done || !onComplete}
                        aria-label={done ? 'Completed' : `Complete order ${ticket.display_no}`}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-700 text-white shadow-sm transition enabled:active:scale-90 enabled:hover:bg-green-800"
                    >
                        <Check className="h-8 w-8" strokeWidth={3} />
                    </button>
                    <span
                        className={`rounded-md px-2.5 py-1 text-base font-extrabold ${ticket.dining_mode === 'IN' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-700'}`}
                    >
                        {ticket.dining_mode}
                    </span>
                    {ticket.table_no && <span className="text-sm font-bold text-slate-500">Table {ticket.table_no}</span>}
                    <span className="ml-auto font-mono text-3xl font-extrabold tracking-wider text-red-700">{ticket.display_no}</span>
                </div>

                <ul className="my-5 flex-1 space-y-2.5">
                    {ticket.lines.map((l, i) => (
                        <li key={i} className="flex items-baseline gap-4">
                            <span className="w-10 shrink-0 text-xl font-semibold text-slate-400">x{l.quantity}</span>
                            <span className="flex-1 text-right">
                                <span className="block text-xl font-bold text-slate-800">{l.name}</span>
                                {l.extras.map((x) => (
                                    <span key={x} className="block text-base font-medium text-slate-500">
                                        + {x}
                                    </span>
                                ))}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-2 border-t border-slate-100! pt-3 text-slate-400">
                    <span
                        onPointerDown={!done && onDragStart ? (e) => e.pointerType !== 'mouse' && onDragStart(e, true) : undefined}
                        className={`-m-2 flex items-center gap-1.5 p-2 text-base font-medium ${!done && onDragStart ? 'touch-none' : ''}`}
                    >
                        <GripVertical className="h-5 w-5" />
                        {done ? 'Served' : 'Drag or Tap ✓'}
                    </span>
                    {canRecall && onRecall && (
                        <button
                            type="button"
                            onClick={onRecall}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold text-amber-700 ring-1 ring-amber-300 transition hover:bg-amber-50"
                        >
                            <RotateCcw className="h-4 w-4" /> Recall
                        </button>
                    )}
                    <span className={`ml-auto flex items-center gap-1.5 font-mono text-lg font-bold ${late ? 'text-red-600' : 'text-slate-500'}`}>
                        <Clock className="h-5 w-5" />
                        {hms(seconds)}
                    </span>
                </div>
            </div>
        );
    },
);
TicketCard.displayName = 'TicketCard';

export default TicketCard;
