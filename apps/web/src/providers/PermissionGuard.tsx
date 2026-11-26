import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '@shared/utils';
import { usePermission } from '../hooks/usePermission';

// A page the signed-in role / screen may not use can't be opened by typing its
// address either — it goes back to /home. Not the security boundary; the API
// refuses the same calls.
const PermissionGuard = ({ permission, children }: PropsWithChildren<{ permission: Permission }>) => {
    const { can } = usePermission();
    if (!can(permission)) return <Navigate to="/home" replace />;
    return <>{children}</>;
};

export default PermissionGuard;
