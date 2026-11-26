import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { MenuCategory, MenuItem } from '@shared/model';
import { peso } from '../../Kiosk/cart';

// UI reference "Cashier Register — Menu & Order Entry": category tabs, Search
// SKU…, tiles with the SKU badge, BESTSELLER, name, price, + Add and the
// quantity already on the ticket ("1x"). Sold-out tiles are greyed.

const MenuPanel = ({ categories, onTicket, onPick }: { categories: MenuCategory[]; onTicket: Map<number, number>; onPick: (item: MenuItem) => void }) => {
    const [activeId, setActiveId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const active = categories.find((c) => c.id === activeId) ?? categories[0];

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return active?.items ?? [];
        return categories.flatMap((c) => c.items).filter((i) => i.sku.toLowerCase().startsWith(q) || i.name.toLowerCase().includes(q));
    }, [search, categories, active]);

    return (
        <section className="flex min-h-0 flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap rounded-xl ring-1 ring-slate-200">
                    {categories.map((c, i) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                                setActiveId(c.id);
                                setSearch('');
                            }}
                            className={`px-3.5 py-2 text-sm font-bold ${i === 0 ? 'rounded-l-xl' : ''} ${i === categories.length - 1 ? 'rounded-r-xl' : ''} ${
                                c.id === active?.id && !search ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {c.id === active?.id && !search ? `${c.code} • ${c.name}` : c.name}
                        </button>
                    ))}
                </div>
                <label className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 sm:w-56">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search SKU…"
                        aria-label="Search SKU or name"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                </label>
            </div>
            <div className="mt-4 grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((item) => {
                    const qty = onTicket.get(item.id) ?? 0;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            disabled={!item.available}
                            onClick={() => onPick(item)}
                            className="relative flex flex-col rounded-2xl p-4 text-left ring-1 ring-slate-200 transition hover:ring-orange-300 disabled:opacity-45"
                        >
                            {qty > 0 && <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-0.5 text-sm font-bold text-white">{qty}x</span>}
                            <span className="flex items-center gap-2">
                                <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">{item.sku}</span>
                                {item.is_bestseller && <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-orange-600">BESTSELLER</span>}
                                {!item.available && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-slate-500">SOLD OUT</span>}
                            </span>
                            <span className="mt-2 min-h-10 font-bold leading-tight text-slate-900">{item.name}</span>
                            <span className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                <span className="font-mono text-lg font-extrabold text-slate-900">{peso(item.price)}</span>
                                <span className="text-sm font-bold text-orange-600">+ Add</span>
                            </span>
                        </button>
                    );
                })}
                {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-slate-400">No item matches “{search}”.</p>}
            </div>
        </section>
    );
};

export default MenuPanel;
