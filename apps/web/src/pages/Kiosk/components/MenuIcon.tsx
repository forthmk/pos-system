import { CupSoda, Drumstick, Hamburger, IceCreamCone, Package, UtensilsCrossed, type LucideIcon } from 'lucide-react';

// Items have no photos yet (menu_items.image_url is empty): each shows its
// category's icon in a soft circle, like the UI references. A photo, when
// there is one, takes its place.

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
    C: { icon: Drumstick, tone: 'bg-amber-50 text-amber-600' },
    B: { icon: Hamburger, tone: 'bg-orange-50 text-orange-600' },
    D: { icon: IceCreamCone, tone: 'bg-rose-50 text-rose-500' },
    R: { icon: CupSoda, tone: 'bg-emerald-50 text-emerald-600' },
    M: { icon: UtensilsCrossed, tone: 'bg-sky-50 text-sky-600' },
};

const MenuIcon = ({ categoryCode, imageUrl, size = 'md' }: { categoryCode: string; imageUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) => {
    const box = size === 'lg' ? 'h-40 w-40' : size === 'sm' ? 'h-12 w-12' : 'h-24 w-24';
    const glyph = size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-6 w-6' : 'h-11 w-11';
    if (imageUrl) return <img src={imageUrl} alt="" className={`${box} rounded-full object-cover`} />;
    const { icon: Icon, tone } = ICONS[categoryCode] ?? { icon: Package, tone: 'bg-slate-100 text-slate-500' };
    return (
        <span className={`flex ${box} items-center justify-center rounded-full ${tone}`} aria-hidden="true">
            <Icon className={glyph} strokeWidth={1.75} />
        </span>
    );
};

export default MenuIcon;
