import { lazy, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '@shared/utils';

const PinLogin = lazy(() => import('../pages/Login/PinLogin'));
const PairScreen = lazy(() => import('../pages/Login/PairScreen'));
const Home = lazy(() => import('../pages/Home/Home'));
const Kiosk = lazy(() => import('../pages/Kiosk/Kiosk'));
const Register = lazy(() => import('../pages/Register/Register'));
const Kitchen = lazy(() => import('../pages/Kitchen/Kitchen'));
const Error404 = lazy(() => import('../pages/Error404'));

// layout 'default' = navbar + signed-in only; 'kiosk' = full screen + signed-in
// only. 'blank' pages are open unless they set `auth`. A page that needs a permission names it (PermissionGuard).
export type AppRoute = {
    path: string;
    element: ReactNode;
    layout: 'default' | 'blank' | 'kiosk';
    auth?: boolean;
    permission?: Permission;
};

export const routes: AppRoute[] = [
    { path: '/', element: <Navigate to="/home" replace />, layout: 'blank' },
    { path: '/login', element: <PinLogin />, layout: 'blank' },
    { path: '/pair', element: <PairScreen />, layout: 'blank' },
    { path: '/home', element: <Home />, layout: 'default' },
    // The self-service kiosk (design §5.1): a paired kiosk opens here.
    { path: '/kiosk', element: <Kiosk />, layout: 'kiosk', permission: 'orders.create' },
    // The cashier register (design §5.3–5.4, §5.10).
    { path: '/register', element: <Register />, layout: 'default', permission: 'orders.settle' },
    // The kitchen display (design §5.5–5.6): a paired KDS screen opens here.
    { path: '/kitchen', element: <Kitchen />, layout: 'kiosk', permission: 'kds.use' },
    { path: '*', element: <Error404 />, layout: 'blank' },
];
