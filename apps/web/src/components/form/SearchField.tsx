/* ──────────────────────────────────────────────────────────────────────────
 * SearchField — the one search box, modelled on the macOS search field
 * (NSSearchField): a leading search button, a trailing ✕ (cancel) while
 * there is text, and — when the page passes `suggestions` — a menu of
 * everything there is to search for.
 *
 * Clicking into the box opens the menu with every suggestion; typing
 * filters it as you go (contains, any case). Pick one with a click, or
 * ↑ / ↓ and Enter; focus stays in the box throughout.
 *
 * Drop-in for darwin-ui's SearchInput: same value / onChange(event) /
 * placeholder / wrapperClassName / className props. Picking an entry or
 * pressing ✕ calls onChange with an event-shaped { target: { value } }.
 * Escape closes the menu, then clears.
 *
 * With `didYouMean`, a misspelling that matches nothing lists the closest
 * names instead ("Did you mean…": "Boromeo" → LNT Borromeo), see
 * utils/closestNames.
 *
 * On a touch screen (phone, iPad — either way up) the on-screen keyboard
 * covers the bottom of the screen, so while the menu is open the box moves
 * up to just under the navbar and the menu takes only the room left above
 * the keyboard, re-measured as the keyboard slides in or the iPad turns.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { closestNames } from '../../utils/closestNames';

/** A page's rows → the distinct, sorted texts to suggest (empty ones dropped). */
export const toSuggestions = <T,>(rows: T[] | undefined, pick: (row: T) => (string | null | undefined)[]) =>
    [...new Set((rows ?? []).flatMap(pick).map((s) => s?.trim()).filter((s): s is string => !!s))].sort((a, b) =>
        a.localeCompare(b),
    );

const ROW = 40; // one entry, h-10
const listHeight = (rows: number) => rows * ROW + 8; // rows in view, + py-1
const MENU_CHROME = 6 + 34 + 8; // mt-1.5, the heading, a little air above the keyboard

const isTouch = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

// The nearest ancestor that scrolls (the layout's <main>, or a dialog body).
const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
    for (let node = el?.parentElement; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    }
    return null;
};

const matches = (text: string, query: string) => text.toLowerCase().includes(query.trim().toLowerCase());

// The typed part shown in bold within an entry.
const Highlighted = ({ text, query }: { text: string; query: string }) => {
    const q = query.trim();
    const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (at < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, at)}
            <strong className="font-bold text-slate-900 dark:text-white">{text.slice(at, at + q.length)}</strong>
            {text.slice(at + q.length)}
        </>
    );
};

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value?: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    /** Classes for the outer box (width, display) — as SearchInput's. */
    wrapperClassName?: string;
    /** Everything there is to search for (see toSuggestions), listed when
     *  the box is clicked and filtered as you type. */
    suggestions?: string[];
    /** Entries in view before the menu scrolls (4, as the Select dropdown). */
    rows?: number;
    /** Nothing contains the text typed: list the closest suggestions instead,
     *  under "Did you mean…" — for picking a name that may be misspelled. */
    didYouMean?: boolean;
}

const SearchField = ({
    value = '',
    onChange,
    placeholder = 'Search',
    wrapperClassName = '',
    className = '',
    suggestions,
    rows = 4,
    didYouMean = false,
    ...inputProps
}: SearchFieldProps) => {
    const menuMax = listHeight(rows);
    const [menuOpen, setMenuOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    // The menu's list height on a touch screen; undefined = the usual 4 rows.
    const [listMax, setListMax] = useState<number | undefined>();

    // A tap anywhere else closes the menu.
    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [menuOpen]);

    // Touch screens: keep the box and its menu above the on-screen keyboard.
    useEffect(() => {
        if (!menuOpen || !isTouch()) {
            setListMax(undefined);
            return;
        }
        const vv = window.visualViewport;
        let frame = 0;
        const fit = () => {
            const root = rootRef.current;
            if (!root) return;
            const visibleTop = vv?.offsetTop ?? 0;
            const visibleBottom = visibleTop + (vv?.height ?? window.innerHeight);
            const header = document.querySelector('header');
            const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
            let rect = root.getBoundingClientRect();
            if (visibleBottom - rect.bottom - MENU_CHROME < menuMax) {
                // Not enough room under the box: scroll it up under the navbar.
                const target = Math.max(visibleTop, headerBottom) + 8;
                const parent = scrollParent(root);
                if (parent && rect.top > target + 1) {
                    parent.scrollTop += rect.top - target;
                    rect = root.getBoundingClientRect();
                }
            }
            setListMax(Math.max(listHeight(2), Math.min(menuMax, visibleBottom - rect.bottom - MENU_CHROME)));
        };
        const refit = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(fit);
        };
        refit();
        // The keyboard slides in after focus; iOS reports it as a resize.
        const later = window.setTimeout(refit, 350);
        vv?.addEventListener('resize', refit);
        window.addEventListener('orientationchange', refit);
        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(later);
            vv?.removeEventListener('resize', refit);
            window.removeEventListener('orientationchange', refit);
        };
    }, [menuOpen, menuMax]);

    // What the menu lists for the text typed so far.
    const contains = useMemo(() => (suggestions ?? []).filter((s) => matches(s, value)), [suggestions, value]);
    // Nothing contains it (a misspelling): the closest names, with didYouMean.
    const guesses = useMemo(
        () => (didYouMean && contains.length === 0 && value.trim() ? closestNames(suggestions ?? [], value) : []),
        [didYouMean, contains.length, suggestions, value],
    );
    const entries = contains.length > 0 ? contains : guesses;
    const guessing = contains.length === 0 && guesses.length > 0;

    // A new list starts with nothing highlighted.
    useEffect(() => setActive(-1), [value, menuOpen]);

    // Keep the highlighted entry in view.
    useEffect(() => {
        if (active < 0) return;
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const emit = (next: string) =>
        onChange({ target: { value: next }, currentTarget: { value: next } } as ChangeEvent<HTMLInputElement>);

    const choose = (text: string) => {
        emit(text);
        setMenuOpen(false);
        inputRef.current?.focus();
    };

    const optionId = (i: number) => `${menuId}-${i}`;
    const hasAnything = (suggestions?.length ?? 0) > 0;

    return (
        <div ref={rootRef} className={`relative ${wrapperClassName}`}>
            <div className="flex h-10 items-center rounded-xl border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition-shadow focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900">
                {/* The search button: opens or closes the menu. */}
                <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        setMenuOpen((open) => !open);
                        inputRef.current?.focus();
                    }}
                    aria-label={menuOpen ? 'Hide search menu' : 'Show search menu'}
                    className="flex h-full shrink-0 items-center gap-0.5 rounded-l-xl pl-3 pr-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <input
                    {...inputProps}
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? menuId : undefined}
                    aria-autocomplete="list"
                    aria-activedescendant={menuOpen && active >= 0 ? optionId(active) : undefined}
                    autoComplete="off"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => {
                        onChange(e);
                        setMenuOpen(true);
                    }}
                    onFocus={(e) => {
                        if (hasAnything) setMenuOpen(true);
                        inputProps.onFocus?.(e);
                    }}
                    onClick={() => hasAnything && setMenuOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (!menuOpen) setMenuOpen(true);
                            else if (entries.length) setActive((i) => (i + 1) % entries.length);
                        } else if (e.key === 'ArrowUp' && menuOpen && entries.length) {
                            e.preventDefault();
                            setActive((i) => (i <= 0 ? entries.length - 1 : i - 1));
                        } else if (e.key === 'Enter') {
                            if (menuOpen && active >= 0 && entries[active]) {
                                e.preventDefault();
                                choose(entries[active]);
                            } else {
                                setMenuOpen(false);
                            }
                        } else if (e.key === 'Escape') {
                            if (menuOpen) {
                                e.preventDefault();
                                e.stopPropagation();
                                setMenuOpen(false);
                            } else if (value) {
                                e.preventDefault();
                                e.stopPropagation();
                                emit('');
                            }
                        } else if (e.key === 'Tab') {
                            setMenuOpen(false);
                        }
                        inputProps.onKeyDown?.(e);
                    }}
                    // The browser's own clear button is replaced by the ✕ below.
                    className={`h-full min-w-0 flex-1 bg-transparent pr-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-white [&::-webkit-search-cancel-button]:appearance-none ${className}`}
                />
                {value && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            emit('');
                            inputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-white hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
                    >
                        <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </button>
                )}
            </div>

            {menuOpen && (
                // The same menu look as the app's Select dropdown: the heading
                // stays put and the list scrolls, `rows` entries in view.
                <div
                    // Clicks in the menu keep focus in the box.
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-56 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10"
                >
                    <div className="border-b border-gray-100 dark:border-white/10">
                        <Heading>{guessing ? 'Did you mean…' : value.trim() ? 'Matches' : 'All'}</Heading>
                    </div>
                    <div
                        ref={listRef}
                        id={menuId}
                        role="listbox"
                        aria-label="Search suggestions"
                        style={{ maxHeight: listMax ?? menuMax }}
                        className="overflow-y-auto overscroll-contain py-1"
                    >
                    {entries.map((text, i) => (
                        <div
                            key={text}
                            id={optionId(i)}
                            data-index={i}
                            role="option"
                            aria-selected={active === i}
                            onClick={() => choose(text)}
                            onMouseEnter={() => setActive(i)}
                            className={`flex h-10 cursor-pointer items-center px-3 text-sm text-slate-700 dark:text-slate-200 ${
                                active === i ? 'bg-slate-100 dark:bg-white/10' : ''
                            }`}
                        >
                            <span className="min-w-0 truncate">
                                {guessing ? text : <Highlighted text={text} query={value} />}
                            </span>
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <p className="px-3 py-2.5 text-sm text-slate-400">
                            {value.trim() ? `No matches for “${value.trim()}”` : 'Nothing to search yet'}
                        </p>
                    )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Heading = ({ children }: { children: string }) => (
    <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{children}</p>
);

export default SearchField;
