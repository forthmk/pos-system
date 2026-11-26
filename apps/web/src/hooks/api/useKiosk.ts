import { useMutation, useQuery } from '@tanstack/react-query';
import { kioskApi } from '@shared/api';
import type { Language, PlaceKioskOrderBody } from '@shared/model';

// The kiosk menu, per language (design §8.1 GET /api/kiosk/menu). A sold-out
// item greys out the moment the live feed says so (menu.availability); the
// interval is only a safety net.
export const useKioskMenu = (lang: Language) =>
    useQuery({
        queryKey: ['kiosk-menu', lang],
        queryFn: async () => (await kioskApi.menu(lang)).data,
        staleTime: 30_000,
        refetchInterval: 60_000,
        placeholderData: (previous) => previous,
    });

// Proceed Order (design §7.2). The caller keeps the same client_ref for a
// retry of the same cart, so a double tap never makes two orders.
export const usePlaceKioskOrder = () =>
    useMutation({
        mutationFn: async (body: PlaceKioskOrderBody) => (await kioskApi.placeOrder(body)).data,
    });
