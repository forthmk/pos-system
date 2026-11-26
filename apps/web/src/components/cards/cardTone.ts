/* The one colour every card shares — Workspaces tiles, the Production /
 * Stocks choosers and the pages' headline StatsCards: the navbar avatar's
 * blue, lighter (blue-400 into blue-600 rather than the brand navy), a
 * deeper blue bottom edge and white text — and CARD_TEXT, a light gradient
 * (white → pale blue → pale gold, pale enough to read on the lighter blue)
 * sliding through the card's words like the greeting's name (still on
 * reduced motion).
 *
 * The per-tile colours in workspaceList.ts (`tone`, `titleGradient`) and
 * StatsCard's accents are no longer drawn; they stay as data. */

export const CARD_TONE = 'from-blue-400 to-blue-600 border-blue-800 text-white';

/** On a card's title, number, label or line of description. */
export const CARD_TEXT =
    'bg-[linear-gradient(90deg,#ffffff,#e0f2fe,#fef3c7,#ffffff)] bg-size-[200%_auto] bg-clip-text text-transparent animate-[name-colors_6s_linear_infinite] motion-reduce:animate-none';
