import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language, MenuItem, OrderSummary } from '@shared/model';
import ConfirmDialog from '../../components/dialogs/ConfirmDialog';
import { LoadingState } from '../../components/ui/Progress';
import { useOrdersBoard } from '../../hooks/api/useKds';
import { useKioskMenu, usePlaceKioskOrder } from '../../hooks/api/useKiosk';
import { useAuth } from '../../hooks/useAuth';
import { useIdleReset } from '../../hooks/useIdleReset';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { uuid } from '../../utils/uuid';
import { cartTotals, initialKioskState, kioskReducer, priceLines } from './cart';
import CartScreen from './components/CartScreen';
import ItemScreen from './components/ItemScreen';
import KioskTopBar from './components/KioskTopBar';
import MenuScreen from './components/MenuScreen';
import OrderSentScreen from './components/OrderSentScreen';
import OrdersBoard from './components/OrdersBoard';
import StartScreen from './components/StartScreen';

// The self-service kiosk (design §5.1, UI references 1–6): start → menu →
// item → cart → Order Sent. The cart is the customer's picks only (cart.ts); the menu and
// its prices come from GET /api/kiosk/menu in the chosen language.
//   Cancel (with a confirm when the cart has something) or no touch for
//   `idle_seconds` + 15 s ("Still there?") clears everything back to start.

type Screen =
    | { name: 'start' }
    | { name: 'menu' }
    | { name: 'item'; item: MenuItem; categoryCode: string }
    | { name: 'cart' }
    | { name: 'sent'; order: OrderSummary };

const errorCode = (e: unknown) => (e as { response?: { data?: { details?: { code?: string } } } })?.response?.data?.details?.code;

const Kiosk = () => {
    const { t, i18n } = useTranslation();
    const { principal } = useAuth();
    const [state, dispatch] = useReducer(kioskReducer, initialKioskState);
    const [screen, setScreen] = useState<Screen>({ name: 'start' });
    const [confirmCancel, setConfirmCancel] = useState(false);
    const menu = useKioskMenu(state.language);
    const placeOrder = usePlaceKioskOrder();
    // Live: sold-out items grey out, the Orders board moves, as they happen.
    useLiveFeed();
    const board = useOrdersBoard();
    const [boardOpen, setBoardOpen] = useState(false);
    const closeBoard = useCallback(() => setBoardOpen(false), []);
    const [orderError, setOrderError] = useState('');
    // One client_ref per cart: a retry of the same cart can't make a second
    // order; any change to the cart starts a new one.
    const clientRef = useRef<string | null>(null);
    useEffect(() => {
        clientRef.current = null;
        setOrderError('');
    }, [state.lines, state.mode, state.payment]);

    // The kiosk speaks the customer's language; a new customer starts in English.
    useEffect(() => {
        if (i18n.language !== state.language) void i18n.changeLanguage(state.language);
    }, [state.language, i18n]);

    const lines = priceLines(state.lines, menu.data?.categories);
    const { count, total } = cartTotals(lines);

    const startOver = useCallback(() => {
        dispatch({ type: 'reset' });
        setConfirmCancel(false);
        setScreen({ name: 'start' });
    }, []);

    const proceed = async () => {
        if (!state.mode || !lines.length) return;
        clientRef.current ??= uuid();
        setOrderError('');
        try {
            const order = await placeOrder.mutateAsync({
                client_ref: clientRef.current,
                dining_mode: state.mode,
                language: state.language,
                payment_method: state.payment,
                expected_total: total,
                lines: state.lines.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity, addon_ids: l.addon_ids })),
            });
            setScreen({ name: 'sent', order });
        } catch (e) {
            const code = errorCode(e);
            if (code === 'ITEM_UNAVAILABLE' || code === 'TOTAL_CHANGED') {
                // Show the customer today's menu: sold-out lines turn red, prices update.
                void menu.refetch();
                setOrderError(t(code === 'ITEM_UNAVAILABLE' ? 'kiosk.itemUnavailable' : 'kiosk.pricesChanged'));
            } else {
                setOrderError(t('kiosk.orderFailed'));
            }
        }
    };

    const idle = useIdleReset({
        enabled: screen.name !== 'start' && screen.name !== 'sent',
        idleSeconds: menu.data?.settings.idle_seconds ?? 60,
        onReset: startOver,
    });

    const setLanguage = (language: Language) => dispatch({ type: 'setLanguage', language });

    let page: React.ReactNode;
    if (screen.name === 'sent') {
        page = (
            <OrderSentScreen
                order={screen.order}
                resetSeconds={menu.data?.settings.reset_seconds ?? 10}
                payWithinMinutes={menu.data?.settings.pay_within_minutes ?? 30}
                terminalCode={principal?.kind === 'device' ? principal.code : 'KIOSK'}
                onDone={startOver}
            />
        );
    } else if (screen.name === 'start' || !state.mode) {
        page = (
            <StartScreen
                language={state.language}
                onLanguage={setLanguage}
                ordersCount={(board.data?.preparing.length ?? 0) + (board.data?.ready.length ?? 0)}
                onOrders={() => setBoardOpen(true)}
                onChoose={(mode) => {
                    dispatch({ type: 'setMode', mode });
                    setScreen({ name: 'menu' });
                }}
            />
        );
    } else if (menu.isLoading) {
        page = <LoadingState fullPage label={t('kiosk.loading')} className="min-h-dvh bg-[#FFF8F0]" />;
    } else if (!menu.data) {
        page = (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#FFF8F0] px-6 text-center">
                <p className="max-w-md text-xl font-bold text-slate-800">{t('kiosk.menuError')}</p>
                <button type="button" onClick={() => menu.refetch()} className="rounded-2xl bg-orange-500 px-6 py-3 text-lg font-bold text-white">
                    {t('kiosk.tryAgain')}
                </button>
            </div>
        );
    } else if (screen.name === 'item') {
        page = (
            <ItemScreen
                key={screen.item.id}
                item={screen.item}
                categoryCode={screen.categoryCode}
                cartCount={count}
                onBack={() => setScreen({ name: 'menu' })}
                onAdd={(quantity, addon_ids) => {
                    dispatch({ type: 'add', menu_item_id: screen.item.id, addon_ids, quantity });
                    setScreen({ name: 'menu' });
                }}
            />
        );
    } else if (screen.name === 'cart') {
        page = (
            <CartScreen
                mode={state.mode}
                lines={lines}
                payment={state.payment}
                onPayment={(payment) => dispatch({ type: 'setPayment', payment })}
                onQuantity={(key, quantity) => dispatch({ type: 'setQuantity', key, quantity })}
                onMenu={() => setScreen({ name: 'menu' })}
                onProceed={proceed}
                sending={placeOrder.isPending}
                error={orderError}
            />
        );
    } else {
        const mode = state.mode;
        page = (
            <MenuScreen
                topBar={
                    <KioskTopBar
                        mode={mode}
                        language={state.language}
                        count={count}
                        onToggleMode={() => dispatch({ type: 'setMode', mode: mode === 'IN' ? 'OUT' : 'IN' })}
                        onLanguage={setLanguage}
                        onCart={() => setScreen({ name: 'cart' })}
                    />
                }
                categories={menu.data.categories}
                count={count}
                total={total}
                onPick={(item, categoryCode) => setScreen({ name: 'item', item, categoryCode })}
                onCancel={() => (count > 0 ? setConfirmCancel(true) : startOver())}
                onCart={() => setScreen({ name: 'cart' })}
            />
        );
    }

    return (
        <>
            {page}
            {boardOpen && screen.name === 'start' && <OrdersBoard board={board.data} onClose={closeBoard} />}
            <ConfirmDialog
                open={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                onConfirm={startOver}
                title={t('kiosk.cancelTitle')}
                description={t('kiosk.cancelHint')}
                confirmLabel={t('kiosk.cancelConfirm')}
                cancelLabel={t('kiosk.keep')}
                tone="danger"
            />
            <ConfirmDialog
                open={idle.prompting}
                onClose={idle.keepGoing}
                onConfirm={startOver}
                title={t('kiosk.stillThere')}
                description={t('kiosk.stillThereHint', { seconds: idle.secondsLeft })}
                confirmLabel={t('kiosk.startOver')}
                cancelLabel={t('kiosk.keepOrdering')}
                tone="primary"
            />
        </>
    );
};

export default Kiosk;
