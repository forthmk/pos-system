// Colored initials square (e.g. "BF" for Bulacan Frozen Foods) so cards are
// scannable at a glance. The color is picked from the name, so the same
// supplier always gets the same color.
const PALETTE = [
    'bg-blue-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-400 text-amber-950',
    'bg-violet-600 text-white',
    'bg-rose-500 text-white',
    'bg-teal-600 text-white',
    'bg-orange-500 text-white',
    'bg-indigo-600 text-white',
];

export const initialsOf = (name?: string | null) =>
    (name ?? '')
        .split(/\s+/)
        .filter((w) => /[A-Za-z0-9]/.test(w))
        .slice(0, 2)
        .map((w) => w.replace(/[^A-Za-z0-9]/g, '')[0]?.toUpperCase() ?? '')
        .join('') || '?';

const colorOf = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
};

const InitialsAvatar = ({ name, className = '' }: { name?: string | null; className?: string }) => (
    <div
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${colorOf(name ?? '')} ${className}`}
    >
        {initialsOf(name)}
    </div>
);

export default InitialsAvatar;
