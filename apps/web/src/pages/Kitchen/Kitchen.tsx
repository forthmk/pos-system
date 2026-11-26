import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { LoadingState } from '../../components/ui/Progress';
import { useClearServed, useCompleteTicket, useKdsTickets, useRecallTicket } from '../../hooks/api/useKds';
import { useAuth } from '../../hooks/useAuth';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { friendlyError } from '../../utils/friendlyError';
import KitchenHeader from './components/KitchenHeader';
import TicketCard from './components/TicketCard';
import { secondsBetween } from './time';
import { useNow } from './useNow';
import { useTicketDrag } from './useTicketDrag';

/* ──────────────────────────────────────────────────────────────────────────
 * The kitchen display (design §5.5–5.6, UI reference "Kitchen Display").
 * Paid orders arrive live as Pending tickets, oldest first; the chef drags a
 * ticket into Completed Orders or taps its green ✓. Completed tickets keep
 * their prep time, can be recalled for `kds_recall_minutes`, and leave the
 * screen (and the Orders board) with Clear Served.
 *
 * Station: ?station=<id>, else this KDS screen's own (or the KDS terminal a
 * chef signed in at), else every station — decided by the API.
 * ────────────────────────────────────────────────────────────────────────── */

const FRESH_SECONDS = 10;

const Kitchen = () => {
    const { principal } = useAuth();
    const [params] = useSearchParams();
    const station = Number(params.get('station')) || undefined;
    const { online, clockOffset } = useLiveFeed();
    const tickets = useKdsTickets(station);
    const complete = useCompleteTicket();
    const recall = useRecallTicket();
    const clearServed = useClearServed();
    const [error, setError] = useState('');
    const now = useNow(clockOffset);

    const zone = useRef<HTMLDivElement>(null);
    const cards = useRef(new Map<number, HTMLDivElement>());
    const act = (mutation: typeof complete, orderId: number, fallback: string) => {
        setError('');
        mutation.mutate(orderId, { onError: (e) => setError(friendlyError(e, fallback)) });
    };
    const bump = (orderId: number) => act(complete, orderId, 'Could not complete the order. Please try again.');
    const { drag, start } = useTicketDrag(zone, bump);

    if (tickets.isLoading) return <LoadingState fullPage />;
    const data = tickets.data;
    const settings = data?.settings ?? { delay_minutes: 5, recall_minutes: 10 };
    const pending = data?.tickets.filter((t) => t.status === 'preparing') ?? [];
    // Latest completed first: the one just bumped is where the chef looks.
    const completed = (data?.tickets.filter((t) => t.status === 'completed') ?? []).sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
    const dragged = drag ? pending.find((t) => t.order_id === drag.orderId) : undefined;
    const cardProps = { now, delayMinutes: settings.delay_minutes, recallMinutes: settings.recall_minutes };

    return (
        <div className="min-h-dvh bg-slate-100 pb-10">
            <KitchenHeader
                stationName={data?.station?.name ?? 'All stations'}
                online={online}
                stats={data && { ...data.stats, pending: pending.length, completed: completed.length }}
                now={now}
                delayMinutes={settings.delay_minutes}
                showHome={principal?.kind === 'staff'}
            />

            {(error || tickets.isError) && (
                <p role="alert" className="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700 ring-1 ring-red-200 sm:mx-6">
                    {error || friendlyError(tickets.error, 'Could not load the tickets.')}
                </p>
            )}

            <div className="grid gap-6 p-4 sm:p-6 2xl:grid-cols-[3fr_2fr] 2xl:items-start">
                {/* Pending */}
                <section className="rounded-2xl border-2 border-dashed border-slate-300! bg-slate-200/40 p-4 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-slate-300! pb-4">
                        <span className="h-4 w-4 rounded-full bg-amber-500" />
                        <h2 className="text-xl font-extrabold tracking-wide text-slate-900 sm:text-2xl">PENDING ORDERS — ACTIVE KITCHEN QUEUE</h2>
                        <span className="rounded-full bg-amber-500 px-3 py-0.5 text-lg font-extrabold text-white">{pending.length}</span>
                        <span className="ml-auto text-base font-bold text-slate-400">
                            <span className="2xl:hidden">Drag card down ↓ to Complete</span>
                            <span className="hidden 2xl:inline">Drag card right → to Complete</span>
                        </span>
                    </div>
                    {pending.length === 0 ? (
                        <p className="py-16 text-center text-lg font-semibold text-slate-400">No orders waiting. New paid orders appear here automatically.</p>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                            {pending.map((t) => (
                                <TicketCard
                                    key={t.order_id}
                                    ref={(el) => {
                                        if (el) cards.current.set(t.order_id, el);
                                        else cards.current.delete(t.order_id);
                                    }}
                                    ticket={t}
                                    {...cardProps}
                                    fresh={secondsBetween(t.sent_to_kitchen_at, now) < FRESH_SECONDS}
                                    dimmed={drag?.orderId === t.order_id}
                                    onComplete={() => bump(t.order_id)}
                                    onDragStart={(e) => {
                                        const el = cards.current.get(t.order_id);
                                        if (el) start(t.order_id, e, el);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Completed — the drop zone */}
                <section
                    ref={zone}
                    className={`rounded-2xl border-2 border-dashed p-4 transition sm:p-6 ${drag?.overZone ? 'border-green-600! bg-emerald-50' : 'border-emerald-400! bg-white/70'}`}
                >
                    <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-slate-200! pb-4">
                        <CircleCheck className="h-8 w-8 fill-green-700 text-white" />
                        <h2 className="text-xl font-extrabold tracking-wide text-slate-900 sm:text-2xl">COMPLETED ORDERS</h2>
                        <span className="rounded-full bg-green-700 px-3 py-0.5 text-lg font-extrabold text-white">{completed.length}</span>
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                clearServed.mutate(undefined, { onError: (e) => setError(friendlyError(e, 'Could not clear the served orders.')) });
                            }}
                            disabled={completed.length === 0 || clearServed.isPending}
                            className="ml-auto rounded-lg px-3 py-2 text-base font-bold text-slate-500 transition enabled:hover:bg-slate-100 enabled:hover:text-slate-800 disabled:opacity-40"
                        >
                            Clear Served
                        </button>
                    </div>
                    <div
                        className={`mb-5 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-lg font-bold transition ${
                            drag?.overZone ? 'border-green-600! bg-green-100 text-green-800' : 'border-emerald-200! bg-emerald-50 text-green-800'
                        }`}
                    >
                        <CircleCheck className="h-6 w-6" /> Drop Pending Order Ticket Here to Complete
                    </div>
                    {completed.length > 0 && (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                            {completed.map((t) => (
                                <TicketCard
                                    key={t.order_id}
                                    ticket={t}
                                    {...cardProps}
                                    onRecall={() => act(recall, t.order_id, 'Could not recall the order.')}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* The card under the finger / mouse while dragging. */}
            {drag && dragged && (
                <div className="pointer-events-none fixed z-50" style={{ left: drag.x - drag.grabX, top: drag.y - drag.grabY, width: drag.width }}>
                    <TicketCard ticket={dragged} {...cardProps} floating />
                </div>
            )}
        </div>
    );
};

export default Kitchen;
