import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@shared/api';
import type { CloseShiftBody, OpenShiftBody, PosOrderBody, SettleBody, VoidOrderBody } from '@shared/model';

// The cashier register's server data (design §5.3–5.4, §5.10).

export const usePosMenu = () =>
    useQuery({ queryKey: ['pos-menu'], queryFn: async () => (await posApi.menu()).data, staleTime: 30_000, refetchInterval: 60_000 });

export const useCurrentShift = () => useQuery({ queryKey: ['pos-shift'], queryFn: async () => (await posApi.currentShift()).data.shift });

export const useOpenShift = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body: OpenShiftBody) => (await posApi.openShift(body)).data.shift,
        onSuccess: (shift) => qc.setQueryData(['pos-shift'], shift),
    });
};

export const useDiscountTypes = () => useQuery({ queryKey: ['pos-discount-types'], queryFn: async () => (await posApi.discountTypes()).data, staleTime: 5 * 60_000 });

/** ORD-000750 preview — refreshed after every sale. */
export const useNextNumber = () => useQuery({ queryKey: ['pos-next-number'], queryFn: async () => (await posApi.nextNumber()).data, refetchInterval: 15_000 });

/** The Kiosk # list (kiosk orders waiting for payment) — refreshed by the live feed; 60 s is the safety net. */
export const useKioskQueue = () => useQuery({ queryKey: ['pos-kiosk-queue'], queryFn: async () => (await posApi.kioskQueue()).data, refetchInterval: 60_000 });

export const useCheckVoucher = () => useMutation({ mutationFn: async (v: { code: string; subtotal: number }) => (await posApi.checkVoucher(v.code, v.subtotal)).data });

const useAfterSale = () => {
    const qc = useQueryClient();
    return () => {
        void qc.invalidateQueries({ queryKey: ['pos-next-number'] });
        void qc.invalidateQueries({ queryKey: ['pos-kiosk-queue'] });
    };
};

export const usePlaceOrder = () => {
    const after = useAfterSale();
    return useMutation({ mutationFn: async (body: PosOrderBody) => (await posApi.placeOrder(body)).data, onSuccess: after });
};

export const useSettleOrder = () => {
    const after = useAfterSale();
    return useMutation({ mutationFn: async (v: { orderId: number; body: SettleBody }) => (await posApi.settle(v.orderId, v.body)).data, onSuccess: after });
};

// Scanning a kiosk slip (design §5.10). A mutation, not a query: a scan locks
// the order to this register.
export const useScanSlip = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (code: string) => (await posApi.scan(code)).data,
        onSuccess: () => void qc.invalidateQueries({ queryKey: ['pos-kiosk-queue'] }),
    });
};

// CLEAR / Next Customer without paying: unlock the scanned order.
export const useReleaseOrder = () => useMutation({ mutationFn: async (orderId: number) => (await posApi.release(orderId)).data });

/* ── reports, close shift, void (design §5.7, §7.9) ────────────────────── */

/** Recent shifts for the report's shift picker (a cashier: own shifts). */
export const useShifts = (enabled = true) => useQuery({ queryKey: ['pos-shifts'], queryFn: async () => (await posApi.shifts()).data, enabled });

/** Shift Sales & Z-Reading figures — refreshed live as orders are paid or voided. */
export const useShiftReport = (shiftId: number | null) =>
    useQuery({
        queryKey: ['pos-report', shiftId],
        queryFn: async () => (await posApi.shiftReport(shiftId!)).data,
        enabled: shiftId !== null,
        refetchInterval: 60_000,
        placeholderData: (previous) => previous,
    });

const useAfterReportChange = () => {
    const qc = useQueryClient();
    return () => {
        for (const queryKey of [['pos-report'], ['pos-shifts'], ['pos-shift'], ['pos-next-number']]) void qc.invalidateQueries({ queryKey });
    };
};

/** Close Shift → the saved Z-reading (the report of the closed shift). */
export const useCloseShift = () => {
    const after = useAfterReportChange();
    return useMutation({ mutationFn: async (v: { shiftId: number; body: CloseShiftBody }) => (await posApi.closeShift(v.shiftId, v.body)).data, onSuccess: after });
};

/** Void + refund with a manager's username + PIN. */
export const useVoidOrder = () => {
    const after = useAfterReportChange();
    return useMutation({ mutationFn: async (v: { orderId: number; body: VoidOrderBody }) => (await posApi.voidOrder(v.orderId, v.body)).data, onSuccess: after });
};

/** Export CSV / Z-Read → the file's name (from the server) and text. */
export const useExportShiftCsv = () =>
    useMutation({
        mutationFn: async (shiftId: number) => {
            const res = await posApi.exportShiftCsv(shiftId);
            const name = /filename="([^"]+)"/.exec(String(res.headers?.['content-disposition'] ?? ''))?.[1] ?? `shift-${shiftId}.csv`;
            return { filename: name, csv: String(res.data) };
        },
    });
