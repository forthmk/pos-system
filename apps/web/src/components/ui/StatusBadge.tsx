/* ──────────────────────────────────────────────────────────────────────────
 * StatusBadge — one look for every status in the system: the same color
 * means the same thing on every page, and each has an icon so it reads at
 * a glance (not by color alone).
 *
 *   waiting  (amber)  pending, submitted
 *   active   (blue)   confirmed, accepted
 *   moving   (indigo) partially delivered, fulfilled, shipped
 *   done     (green)  delivered, received, active (records)
 *   stopped  (red)    cancelled, rejected, revoked
 *   neutral  (slate)  draft, inactive, anything unknown
 * ────────────────────────────────────────────────────────────────────────── */
import {
    CheckCircle2,
    CircleDashed,
    CircleSlash,
    Clock,
    PackageCheck,
    Truck,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

type Tone = 'waiting' | 'active' | 'moving' | 'done' | 'stopped' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
    waiting: 'bg-amber-50 text-amber-700 ring-amber-200',
    active: 'bg-blue-50 text-blue-700 ring-blue-200',
    moving: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    stopped: 'bg-red-50 text-red-700 ring-red-200',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS: Record<string, { tone: Tone; icon: LucideIcon }> = {
    draft: { tone: 'neutral', icon: CircleDashed },
    pending: { tone: 'waiting', icon: Clock },
    submitted: { tone: 'waiting', icon: Clock },
    confirmed: { tone: 'active', icon: CheckCircle2 },
    accepted: { tone: 'active', icon: CheckCircle2 },
    'partially delivered': { tone: 'moving', icon: Truck },
    fulfilled: { tone: 'moving', icon: PackageCheck },
    shipped: { tone: 'moving', icon: Truck },
    delivered: { tone: 'done', icon: PackageCheck },
    received: { tone: 'done', icon: PackageCheck },
    active: { tone: 'done', icon: CheckCircle2 },
    cancelled: { tone: 'stopped', icon: XCircle },
    rejected: { tone: 'stopped', icon: XCircle },
    revoked: { tone: 'stopped', icon: XCircle },
    inactive: { tone: 'neutral', icon: CircleSlash },
};

const StatusBadge = ({ status, size = 'sm' }: { status?: string | null; size?: 'xs' | 'sm' }) => {
    const key = (status ?? '').toLowerCase();
    const { tone, icon: Icon } = STATUS[key] ?? { tone: 'neutral' as Tone, icon: CircleDashed };
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium capitalize ring-1 ring-inset ${TONE_CLASS[tone]} ${
                size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
            }`}
        >
            <Icon className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
            {status ?? '—'}
        </span>
    );
};

export default StatusBadge;
