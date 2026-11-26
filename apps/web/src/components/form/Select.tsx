/* ──────────────────────────────────────────────────────────────────────────
 * Select — a drop-in replacement for <select> with our own option list.
 *
 * Why: the browser's own <select> menu is drawn by the device. On Safari
 * (Mac/iPad) it floats over the field with the checked item on top, and it
 * can be as tall as the screen. This one always opens BELOW the field (above
 * only when there's no room below), shows at most 4 options at a time and
 * scrolls the rest, and floats over dialogs without being clipped.
 *
 * Use it exactly like <select>: same props, same <option> children, works
 * with react-hook-form's register() and with value/onChange. A real
 * <select> stays in the page (hidden) and is the source of truth: picking an
 * option sets its value and fires a real `change` event, so forms,
 * validation and onChange handlers behave as before.
 *
 * `searchable` puts a search box at the top of the open list: typing
 * filters the options (contains, any case), ↑ / ↓ and Enter pick — for
 * long lists such as suppliers and raw materials.
 *
 * On a touch screen (phone, iPad) a searchable list opens as a panel of its
 * own instead — search box on top, options below, a ✕ to close — sized to
 * the part of the screen the on-screen keyboard leaves free, so the keyboard
 * never covers the options. Its text is 16px, so Safari doesn't zoom in.
 * ────────────────────────────────────────────────────────────────────────── */
import {
    Children,
    forwardRef,
    isValidElement,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
    type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { CLOSE_X } from '../ui/CloseX';

const VISIBLE_OPTIONS = 4;
const OPTION_HEIGHT = 40; // px, matches h-10 below
const LIST_PADDING = 8; // py-1 top + bottom
const LIST_MAX_HEIGHT = VISIBLE_OPTIONS * OPTION_HEIGHT + LIST_PADDING;
const SEARCH_HEIGHT = 48; // the searchable list's search box row
const GAP = 4;
const EDGE = 8;
// Dialogs (darwin-ui) sit at z-index 9999; the list floats above them.

// `className` comes from the <option>'s own className: a colour for that
// option's text, in the list and on the button once it is chosen. `dot` comes
// from its `data-dot` attribute: a background class for a small coloured dot
// before the option in the list (e.g. data-dot="bg-sky-500").
type Option = { value: string; label: string; disabled: boolean; className?: string; dot?: string };

// Plain text of an option's children ("Pork" + " (Large)" → "Pork (Large)").
const textOf = (node: ReactNode): string => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
    return '';
};

// Every <option> under children, through arrays (.map) and fragments.
const collectOptions = (children: ReactNode, out: Option[] = []): Option[] => {
    Children.forEach(children, (child) => {
        if (
            !isValidElement<{
                value?: unknown;
                children?: ReactNode;
                disabled?: boolean;
                className?: string;
                'data-dot'?: string;
            }>(child)
        )
            return;
        if (child.type === 'option') {
            const label = textOf(child.props.children);
            out.push({
                value: child.props.value !== undefined ? String(child.props.value) : label,
                label,
                disabled: Boolean(child.props.disabled),
                className: child.props.className,
                dot: child.props['data-dot'],
            });
        } else {
            collectOptions(child.props.children, out);
        }
    });
    return out;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    /** A search box at the top of the open list that filters the options. */
    searchable?: boolean;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
    {
        id,
        className = '',
        style,
        children,
        disabled,
        'aria-invalid': ariaInvalid,
        'aria-describedby': ariaDescribedBy,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        title,
        searchable = false,
        ...selectProps
    },
    forwardedRef,
) {
    const listId = useId();
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const typed = useRef({ text: '', at: 0 });

    const options = collectOptions(children);
    const [selected, setSelected] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [pos, setPos] = useState<CSSProperties>({});
    const [query, setQuery] = useState('');
    // Touch screens get the panel (see the header); the visible part of the
    // screen above the keyboard, which the panel fits into.
    const [sheet, setSheet] = useState(false);
    const [view, setView] = useState({ top: 0, height: 0 });

    // What the open list shows: every option, or — while searching — the
    // ones whose label contains the text (the empty placeholder left out).
    const q = query.trim().toLowerCase();
    const shown = searchable && q ? options.filter((o) => o.value !== '' && o.label.toLowerCase().includes(q)) : options;

    const setRefs = useCallback(
        (el: HTMLSelectElement | null) => {
            selectRef.current = el;
            if (typeof forwardedRef === 'function') forwardedRef(el);
            else if (forwardedRef) forwardedRef.current = el;
        },
        [forwardedRef],
    );

    // Mirror whatever the hidden <select> holds — set by props, by
    // react-hook-form (defaults, reset) or by a pick.
    const sync = useCallback(() => {
        const el = selectRef.current;
        if (el && el.value !== selected) setSelected(el.value);
    }, [selected]);
    useLayoutEffect(sync);
    useEffect(() => {
        const el = selectRef.current;
        if (!el) return;
        el.addEventListener('change', sync);
        // react-hook-form focuses the field on a failed submit: focus the
        // visible button instead of the hidden select.
        const forward = () => buttonRef.current?.focus();
        el.addEventListener('focus', forward);
        return () => {
            el.removeEventListener('change', sync);
            el.removeEventListener('focus', forward);
        };
    }, [sync]);

    const current = options.find((o) => o.value === selected);
    const isPlaceholder = !current || current.value === '';

    // Below the field; above only when it doesn't fit below and fits better above.
    const place = useCallback(() => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const extra = searchable ? SEARCH_HEIGHT : 0;
        const height = Math.min(LIST_MAX_HEIGHT, options.length * OPTION_HEIGHT + LIST_PADDING) + extra;
        const below = window.innerHeight - rect.bottom - GAP - EDGE;
        const above = rect.top - GAP - EDGE;
        const up = below < height && above > below;
        const width = Math.min(Math.max(rect.width, 180), window.innerWidth - EDGE * 2);
        const left = Math.min(Math.max(rect.left, EDGE), window.innerWidth - width - EDGE);
        setPos({
            position: 'fixed',
            left,
            width,
            maxHeight: Math.min(LIST_MAX_HEIGHT + extra, Math.max(up ? above : below, OPTION_HEIGHT + LIST_PADDING + extra)),
            ...(up ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
        });
    }, [options.length, searchable]);

    const openList = () => {
        if (disabled) return;
        sync();
        setQuery('');
        const index = options.findIndex((o) => o.value === (selectRef.current?.value ?? selected));
        setActive(index >= 0 ? index : options.findIndex((o) => !o.disabled));
        const touch =
            typeof window.matchMedia === 'function' &&
            (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640);
        setSheet(searchable && touch);
        place();
        setOpen(true);
    };
    const close = () => setOpen(false);

    const pick = (option: Option) => {
        if (option.disabled) return;
        const el = selectRef.current;
        if (el && el.value !== option.value) {
            el.value = option.value;
            // A real change event: React's onChange and react-hook-form both see it.
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        sync();
        close();
        buttonRef.current?.focus();
    };

    // Keep the list attached to the field while the page or a dialog scrolls.
    useEffect(() => {
        if (!open) return;
        let frame = 0;
        const follow = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(place);
        };
        const outside = (e: PointerEvent) => {
            const target = e.target as Node;
            if (!buttonRef.current?.contains(target) && !listRef.current?.contains(target)) close();
        };
        window.addEventListener('scroll', follow, true);
        window.addEventListener('resize', follow);
        document.addEventListener('pointerdown', outside, true);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', follow, true);
            window.removeEventListener('resize', follow);
            document.removeEventListener('pointerdown', outside, true);
        };
    }, [open, place]);

    // The panel follows the on-screen keyboard: it fills what's left above it.
    useEffect(() => {
        if (!open || !sheet) return;
        const vv = window.visualViewport;
        const measure = () =>
            setView({ top: vv?.offsetTop ?? 0, height: vv?.height ?? window.innerHeight });
        measure();
        vv?.addEventListener('resize', measure);
        vv?.addEventListener('scroll', measure);
        window.addEventListener('resize', measure);
        return () => {
            vv?.removeEventListener('resize', measure);
            vv?.removeEventListener('scroll', measure);
            window.removeEventListener('resize', measure);
        };
    }, [open, sheet]);

    // A searchable list takes the typing as soon as it opens.
    useEffect(() => {
        if (open && searchable) searchRef.current?.focus();
    }, [open, searchable]);

    // A new search starts at its first match.
    useEffect(() => {
        if (searchable && open) setActive(shown.findIndex((o) => !o.disabled));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // The highlighted option stays in view as it moves.
    useEffect(() => {
        if (!open || active < 0) return;
        listRef.current
            ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [open, active]);

    const move = (from: number, step: 1 | -1) => {
        for (let i = from + step; i >= 0 && i < shown.length; i += step) {
            if (!shown[i].disabled) return i;
        }
        return from;
    };

    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        const inSearch = e.currentTarget === searchRef.current;
        if (disabled) return;
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                openList();
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActive((i) => move(i, 1));
                return;
            case 'ArrowUp':
                e.preventDefault();
                setActive((i) => move(i, -1));
                return;
            case 'Home':
                e.preventDefault();
                setActive(move(-1, 1));
                return;
            case 'End':
                e.preventDefault();
                setActive(move(shown.length, -1));
                return;
            case ' ':
                if (inSearch) return; // a space is part of the search
            // falls through
            case 'Enter':
                e.preventDefault();
                if (shown[active]) pick(shown[active]);
                return;
            case 'Escape':
                // Close just the list, not the dialog around it.
                e.preventDefault();
                e.stopPropagation();
                close();
                buttonRef.current?.focus();
                return;
            case 'Tab':
                close();
                return;
        }
        // Type to jump: "po" goes to the first option starting with "po".
        if (!inSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const now = Date.now();
            const text = (now - typed.current.at > 600 ? '' : typed.current.text) + e.key.toLowerCase();
            typed.current = { text, at: now };
            const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(text));
            if (hit >= 0) setActive(hit);
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                id={id}
                disabled={disabled}
                title={title}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                onClick={() => (open ? close() : openList())}
                onKeyDown={onKeyDown}
                style={style}
                className={`inline-flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            >
                <span className={`min-w-0 truncate ${isPlaceholder ? 'text-slate-400' : (current?.className ?? '')}`}>
                    {current?.label ?? options[0]?.label ?? ''}
                </span>
                <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {/* After the button, so the button stays the first child for
                space-y / first: styling. */}
            <select
                ref={setRefs}
                {...selectProps}
                disabled={disabled}
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
            >
                {children}
            </select>
            {open &&
                createPortal(
                    sheet ? (
                        <div className="fixed inset-0 z-[10050]">
                            {/* A tap on the dimmed page closes it (the outside handler). */}
                            <div aria-hidden="true" className="absolute inset-0 bg-slate-900/40" />
                            <div
                                ref={listRef}
                                role="dialog"
                                aria-label={ariaLabel ?? 'Choose an option'}
                                style={{ top: view.top + 12, height: Math.max(view.height - 24, 200) }}
                                className="absolute left-3 right-3 mx-auto flex max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
                            >
                                <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
                                    <span className="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-white">
                                        {ariaLabel ?? 'Choose'}
                                    </span>
                                    <button type="button" onClick={close} aria-label="Close" className={CLOSE_X}>
                                        <X />
                                    </button>
                                </div>
                                <div className="shrink-0 px-3 pb-2">
                                    <div className="flex h-12 items-center gap-2 rounded-xl bg-slate-100 px-3 dark:bg-white/10">
                                        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
                                        <input
                                            ref={searchRef}
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={onKeyDown}
                                            placeholder="Search…"
                                            aria-label="Search the options"
                                            aria-controls={listId}
                                            autoComplete="off"
                                            enterKeyHint="done"
                                            className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-white"
                                        />
                                        {query && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setQuery('');
                                                    searchRef.current?.focus();
                                                }}
                                                aria-label="Clear search"
                                                className="rounded-full p-1 text-slate-400"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex min-h-0 flex-1 flex-col border-t border-gray-100 dark:border-white/10">
                    <ul
                        id={listId}
                        role="listbox"
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                    >
                        {shown.length === 0 && (
                            <li className="flex h-10 items-center px-3 text-sm text-slate-400">No matches for “{query.trim()}”</li>
                        )}
                        {shown.map((option, index) => {
                            const isSelected = option.value === selected;
                            return (
                                <li
                                    key={`${option.value}-${index}`}
                                    id={`${listId}-${index}`}
                                    data-index={index}
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-disabled={option.disabled || undefined}
                                    onMouseEnter={() => !option.disabled && setActive(index)}
                                    onClick={() => pick(option)}
                                    className={`flex cursor-pointer items-center gap-2 ${sheet ? 'h-12 px-4 text-base' : 'h-10 px-3 text-sm'} ${
                                        option.disabled
                                            ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                                            : isSelected
                                              ? 'font-medium text-blue-700 dark:text-blue-300'
                                              : 'text-gray-700 dark:text-slate-200'
                                    } ${index === active && !option.disabled ? 'bg-slate-100 dark:bg-white/10' : ''}`}
                                >
                                    {option.dot && (
                                        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
                                    )}
                                    <span className={`min-w-0 flex-1 truncate ${option.disabled ? '' : (option.className ?? '')}`}>
                                        {option.label}
                                    </span>
                                    {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                                </li>
                            );
                        })}
                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                    <div
                        ref={listRef}
                        style={pos}
                        // Keep focus on the button (or the search box) while choosing.
                        onMouseDown={(e) => e.target !== searchRef.current && e.preventDefault()}
                        className="z-[10050] flex flex-col overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10"
                    >
                        {searchable && (
                            <div className="shrink-0 border-b border-gray-100 p-1.5 dark:border-white/10">
                                <div className="flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-2.5 dark:bg-white/10">
                                    <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={onKeyDown}
                                        placeholder="Search…"
                                        aria-label="Search the options"
                                        aria-controls={listId}
                                        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                                        autoComplete="off"
                                        className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-white"
                                    />
                                </div>
                            </div>
                        )}
                    <ul
                        id={listId}
                        role="listbox"
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                    >
                        {shown.length === 0 && (
                            <li className="flex h-10 items-center px-3 text-sm text-slate-400">No matches for “{query.trim()}”</li>
                        )}
                        {shown.map((option, index) => {
                            const isSelected = option.value === selected;
                            return (
                                <li
                                    key={`${option.value}-${index}`}
                                    id={`${listId}-${index}`}
                                    data-index={index}
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-disabled={option.disabled || undefined}
                                    onMouseEnter={() => !option.disabled && setActive(index)}
                                    onClick={() => pick(option)}
                                    className={`flex cursor-pointer items-center gap-2 ${sheet ? 'h-12 px-4 text-base' : 'h-10 px-3 text-sm'} ${
                                        option.disabled
                                            ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                                            : isSelected
                                              ? 'font-medium text-blue-700 dark:text-blue-300'
                                              : 'text-gray-700 dark:text-slate-200'
                                    } ${index === active && !option.disabled ? 'bg-slate-100 dark:bg-white/10' : ''}`}
                                >
                                    {option.dot && (
                                        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
                                    )}
                                    <span className={`min-w-0 flex-1 truncate ${option.disabled ? '' : (option.className ?? '')}`}>
                                        {option.label}
                                    </span>
                                    {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                                </li>
                            );
                        })}
                    </ul>
                    </div>
                    ),
                    document.body,
                )}
        </>
    );
});

export default Select;
