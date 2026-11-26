import { createBrowserRouter } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import AuthGuard from '../providers/AuthGuard';
import PermissionGuard from '../providers/PermissionGuard';
import { routes } from './routes';

// Every navbar page needs someone signed in, and so does any blank page
// marked `auth`. A route naming a `permission` also needs that permission.
const router = createBrowserRouter(
    routes.map(({ auth, permission, layout, ...route }) => {
        const element = permission ? <PermissionGuard permission={permission}>{route.element}</PermissionGuard> : route.element;
        const page = layout === 'blank' ? <BlankLayout>{element}</BlankLayout> : <DefaultLayout>{element}</DefaultLayout>;
        return { ...route, element: layout === 'default' || auth ? <AuthGuard>{page}</AuthGuard> : page };
    }),
);

export default router;
