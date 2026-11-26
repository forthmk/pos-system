import React from 'react';
import { Package } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import { CARD_TEXT, CARD_TONE } from './cardTone';

// icon    — any React element (lucide icon, svg, etc.), drawn in the corner
// accent  — the card's colour
interface CardItem {
    label: string;
    value: number;
    icon?: React.ReactNode;
    accent?: 'blue' | 'green' | 'amber' | 'red';
}

interface StatsCardProps {
    stats: CardItem[];
    loading?: boolean; // show a shimmering placeholder instead of the number
    // Bigger, bold labels — for pages with only a couple of headline counts
    // (Inventory, Wastage, Store Requests), where the label is the point.
    emphasis?: boolean;
}

// Every card is the one card colour (cardTone). `accent` is kept on the data
// but no longer changes the colour.

// The page's icon, drawn like a tile's: a large outline in the card's own
// text colour (whatever size and colour the page gave it).
const ICON_AS_TILE = '[&>svg]:!h-full [&>svg]:!w-full [&>svg]:!text-current [&_svg]:[stroke-width:1.4]';

// The cards share the row between them, however many there are: two cards
// take half the width each, three a third, four a quarter (five or more wrap
// four to a row). Phones get at most two to a row — a narrower card is too
// small to read there — and an odd last card there takes the full row.
const gridCols = (count: number) =>
    count <= 1
        ? 'grid-cols-1'
        : count === 2
          ? 'grid-cols-2'
          : count === 3
            ? 'grid-cols-2 md:grid-cols-3'
            : 'grid-cols-2 md:grid-cols-4';

const StatsCard: React.FC<StatsCardProps> = ({ stats, loading = false, emphasis = false }) => {
    const oddLastOnPhone = stats.length > 2 && stats.length % 2 === 1;
    // A lone card spans the whole row, so its number and label are centred
    // and set larger rather than left in one corner.
    const single = stats.length === 1;
    return (
        <div className={`grid ${gridCols(stats.length)} gap-3`}>
            {stats.map((item, index) => {
                const icon = item.icon ?? (
                    <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" />
                );
                return (
                    <div
                        key={index}
                        className={`${
                            oddLastOnPhone && index === stats.length - 1 ? 'col-span-2 md:col-span-1' : ''
                        } relative min-w-0 overflow-hidden rounded-2xl border-b-[6px] bg-linear-to-br shadow-sm ${CARD_TONE} ${
                            single
                                ? 'flex flex-col items-center justify-center p-4 text-center sm:p-5'
                                : 'flex h-28 flex-col justify-between p-4 sm:h-32 lg:h-36 lg:p-5'
                        }`}
                    >
                        {/* Number at the top, label at the bottom, icon in the
                            corner; a lone card centres its number and label. */}
                        {loading ? (
                            <Skeleton className={`h-9 w-16 ${single ? 'sm:h-10' : 'lg:h-10'}`} />
                        ) : (
                            <p
                                className={`relative z-10 font-extrabold leading-none tracking-tight ${CARD_TEXT} ${
                                    single ? 'text-4xl sm:text-5xl' : 'text-3xl lg:text-4xl'
                                }`}
                            >
                                {item.value}
                            </p>
                        )}
                        <p
                            className={`relative z-10 font-semibold ${CARD_TEXT} ${
                                single
                                    ? 'mt-2 text-base sm:text-lg lg:text-xl'
                                    : `max-w-[65%] ${emphasis ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`
                            }`}
                        >
                            {item.label}
                        </p>
                        <span
                            aria-hidden="true"
                            className={`absolute bottom-3 right-3 opacity-80 ${ICON_AS_TILE} ${
                                single ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16'
                            }`}
                        >
                            {icon}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default StatsCard;
