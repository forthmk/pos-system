// posApi — the cashier register (backend: apps/api/src/modules/pos).
import { createApi } from '../axios';
import type {
    DiscountType,
    KioskMenu,
    KioskQueueItem,
    OpenShiftBody,
    OrderSummary,
    PosOrderBody,
    ScanResult,
    SettleBody,
    ShiftSummary,
    VoucherCheck,
} from '../model';
const { get, patch, post } = createApi();

export const posApi = {
    menu: () => get<KioskMenu>('/pos/menu'),
    setItemAvailability: (id: number, is_available: boolean) => patch(`/pos/menu-items/${id}/availability`, { is_available }),
    setAddonAvailability: (id: number, is_available: boolean) => patch(`/pos/addons/${id}/availability`, { is_available }),

    currentShift: () => get<{ shift: ShiftSummary | null }>('/pos/shifts/current'),
    openShift: (body: OpenShiftBody) => post<{ shift: ShiftSummary }>('/pos/shifts/open', body),

    discountTypes: () => get<DiscountType[]>('/pos/discount-types'),
    checkVoucher: (code: string, subtotal: number) => post<VoucherCheck>('/pos/vouchers/validate', { code, subtotal }),
    nextNumber: () => get<{ order_no: string; display_no: string }>('/pos/next-number'),
    kioskQueue: () => get<KioskQueueItem[]>('/pos/orders', { status: 'awaiting_payment' }),

    placeOrder: (body: PosOrderBody) => post<OrderSummary>('/pos/orders', body),
    settle: (orderId: number, body: SettleBody) => post<OrderSummary>(`/pos/orders/${orderId}/settle`, body),
    cancel: (orderId: number) => post<OrderSummary>(`/pos/orders/${orderId}/cancel`),

    scan: (code: string) => get<ScanResult>(`/pos/scan/${encodeURIComponent(code)}`),
    release: (orderId: number) => post<{ released: boolean }>(`/pos/orders/${orderId}/release`),
};
