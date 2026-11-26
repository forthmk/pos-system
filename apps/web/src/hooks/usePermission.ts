import { can as allowed, type Actor, type Permission } from '@shared/utils';
import { useAuth } from './useAuth';

// What the signed-in role / screen may do — the same PERMISSIONS table the API
// checks on every request (packages/shared/utils/permissions.ts). This only
// shows / hides things; the API is the real gate.
export function usePermission() {
    const { principal } = useAuth();
    const actor: Actor | null = !principal ? null : principal.kind === 'staff' ? principal.role : principal.type;
    const can = (permission: Permission) => allowed(actor, permission);
    return { actor, can };
}
