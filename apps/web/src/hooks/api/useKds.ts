import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kdsApi } from '@shared/api';
import type { KdsTickets } from '@shared/model';

// The kitchen display and the Orders board (design §5.5–5.6). The live feed
// (hooks/useLiveFeed.ts) refreshes these the moment an order changes; the
// interval is only a safety net.

export const useKdsTickets = (station?: number) =>
    useQuery({
        queryKey: ['kds-tickets', station ?? null],
        queryFn: async () => (await kdsApi.tickets(station)).data,
        refetchInterval: 60_000,
        placeholderData: (previous) => previous,
    });

export const useOrdersBoard = (enabled = true) =>
    useQuery({ queryKey: ['orders-board'], queryFn: async () => (await kdsApi.board()).data, refetchInterval: 60_000, enabled });

/**
 * Complete / recall move the ticket on screen at once (wet hands, busy
 * kitchen), then the server's answer — or the live event — settles it. On an
 * error the list reloads, so the ticket goes back where it really is.
 */
const useTicketMove = (call: (orderId: number) => Promise<unknown>, to: 'completed' | 'preparing') => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: call,
        onMutate: async (orderId: number) => {
            await qc.cancelQueries({ queryKey: ['kds-tickets'] });
            qc.setQueriesData<KdsTickets>({ queryKey: ['kds-tickets'] }, (data) =>
                data && {
                    ...data,
                    tickets: data.tickets.map((t) =>
                        t.order_id === orderId ? { ...t, status: to, completed_at: to === 'completed' ? new Date().toISOString() : null } : t,
                    ),
                },
            );
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: ['kds-tickets'] });
            void qc.invalidateQueries({ queryKey: ['orders-board'] });
        },
    });
};

export const useCompleteTicket = () => useTicketMove(async (id) => (await kdsApi.complete(id)).data, 'completed');
export const useRecallTicket = () => useTicketMove(async (id) => (await kdsApi.recall(id)).data, 'preparing');

export const useClearServed = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => (await kdsApi.clearServed()).data,
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: ['kds-tickets'] });
            void qc.invalidateQueries({ queryKey: ['orders-board'] });
        },
    });
};
