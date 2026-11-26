# hooks/api — TanStack Query hooks

One file per backend module, the same split as `packages/shared/api`:

| File | Hooks | Calls |
|---|---|---|
| `useKiosk.ts` | `useKioskMenu(lang)` · `usePlaceKioskOrder()` | `kioskApi` |
| `usePos.ts` | `usePosMenu`, `useCurrentShift` / `useOpenShift`, `useDiscountTypes`, `useNextNumber`, `useKioskQueue`, `useCheckVoucher`, `usePlaceOrder`, `useSettleOrder`, `useScanSlip` (a mutation — a scan locks the order), `useReleaseOrder` | `posApi` |
| `useKds.ts` | `useKdsTickets(station?)`, `useCompleteTicket` / `useRecallTicket` (move the ticket on screen at once, roll back on error), `useClearServed`, `useOrdersBoard` | `kdsApi` |

**Live refresh:** `hooks/useLiveFeed.ts` (one WebSocket to `/api/live`) invalidates these query keys when the server announces a change — `REFRESH` there maps each event to its keys. A page that shows live data calls `useLiveFeed()` once (Kiosk, Register, Kitchen); the `refetchInterval`s are only a safety net.

Pattern (from the commissary's `hooks/api/README.md`): reads are `useQuery` with a `queryKey` that includes every parameter (`['kiosk-menu', lang]`); writes are `useMutation` that `invalidateQueries` on success. Pages and components use these hooks — never `@shared/api` or `services/api` directly.
