import { useMutation } from '@tanstack/react-query';
import { posApi } from '@shared/api';

// Scanning a kiosk slip (design §5.10, GET /api/pos/scan/:code). A mutation,
// not a query: a scan locks the order to this register.
export const useScanSlip = () =>
    useMutation({
        mutationFn: async (code: string) => (await posApi.scan(code)).data,
    });

// CLEAR / Next Customer without paying: unlock the scanned order.
export const useReleaseOrder = () =>
    useMutation({
        mutationFn: async (orderId: number) => (await posApi.release(orderId)).data,
    });
