import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/ui/Progress';

// Wraps every page that needs someone signed in (router/index.tsx). While the
// saved session is being checked it shows a loader; signed out goes to the
// PIN sign-in page.
const AuthGuard = ({ children }: PropsWithChildren) => {
    const { status } = useAuth();
    const location = useLocation();
    if (status === 'loading') return <LoadingState fullPage />;
    if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    return <>{children}</>;
};

export default AuthGuard;
