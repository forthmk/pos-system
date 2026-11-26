# hooks/api — TanStack Query hooks

One file per backend module, the same split as `packages/shared/api`:

| File | Hooks | Calls |
|---|---|---|
| `useKiosk.ts` | `useKioskMenu(lang)` — refreshed every minute so sold-out items grey out | `kioskApi` |
| `usePos.ts` | (QB-007) | `posApi` |
| `useKds.ts` | (QB-008) | `kdsApi` |

Pattern (from the commissary's `hooks/api/README.md`): reads are `useQuery` with a `queryKey` that includes every parameter (`['kiosk-menu', lang]`); writes are `useMutation` that `invalidateQueries` on success. Pages and components use these hooks — never `@shared/api` or `services/api` directly.
