import { lazy, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '@shared/utils';

const PinLogin = lazy(() => import('../pages/Login/PinLogin'));
const PairScreen = lazy(() => import('../pages/Login/PairScreen'));
const Home = lazy(() => import('../pages/Home/Home'));
const Error404 = lazy(() => import('../pages/Error404'));

// layout 'default' = navbar + signed-in only. 'blank' pages are open unless
// they set `auth`. A page that needs a permission names it (PermissionGuard).
export type AppRoute = {
    path: string;
    element: ReactNode;
    layout: 'default' | 'blank';
    auth?: boolean;
    permission?: Permission;
};

export const routes: AppRoute[] = [
    { path: '/', element: <Navigate to="/home" replace />, layout: 'blank' },
    { path: '/login', element: <PinLogin />, layout: 'blank' },
    { path: '/pair', element: <PairScreen />, layout: 'blank' },
    { path: '/home', element: <Home />, layout: 'default' },
    { path: '*', element: <Error404 />, layout: 'blank' },
];
