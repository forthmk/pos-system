import { Link, Navigate } from 'react-router-dom';
import { ChartColumn, CheckCircle2, ChefHat, MonitorSmartphone, ScanBarcode, UserRound } from 'lucide-react';
import { PERMISSIONS, type Permission } from '@shared/utils';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';

// Home: who is signed in, at which terminal, and what this role / screen may
// do (the shared PERMISSIONS table, design §2.2). The Register, Kitchen,
// Reports and Admin screens are linked from here as each ticket lands.

const PERMISSION_LABEL: Record<Permission, string> = {
    'menu.view': 'See the menu',
    'menu.edit': 'Edit the menu, prices and extras',
    'menu.availability': 'Mark items sold out / back in',
    'orders.create': 'Place orders',
    'orders.board': 'See the Orders board (Preparing / Ready)',
    'orders.settle': 'Scan kiosk slips and take payment',
    'orders.cancel': 'Cancel unpaid orders',
    'orders.void': 'Void and refund paid orders',
    'kds.use': 'Use the kitchen display',
    'shifts.use': 'Open and close shifts',
    'reports.view': 'See shift sales',
    'reports.export': 'Export CSV / Z-Read',
    'vouchers.manage': 'Manage vouchers',
    'users.manage': 'Manage staff',
    'terminals.manage': 'Pair kiosks and kitchen screens',
    'settings.manage': 'Change store settings',
};

const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', cashier: 'Cashier', chef: 'Chef' } as const;

const Home = () => {
    const { principal } = useAuth();
    const { can } = usePermission();
    if (!principal) return null;
    // A paired kiosk has one job: the ordering screen.
    if (principal.kind === 'device' && principal.type === 'kiosk') return <Navigate to="/kiosk" replace />;
    // …and a paired kitchen screen: the kitchen display.
    if (principal.kind === 'device' && principal.type === 'kds') return <Navigate to="/kitchen" replace />;

    const isStaff = principal.kind === 'staff';
    const allowed = (Object.keys(PERMISSIONS) as Permission[]).filter(can);

    return (
        <div className="mx-auto max-w-3xl space-y-5 p-4">
            <section className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    {isStaff ? <UserRound className="h-7 w-7" /> : <MonitorSmartphone className="h-7 w-7" />}
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-extrabold text-slate-900">{isStaff ? `Hello, ${principal.name}` : principal.name}</h1>
                    <p className="text-sm text-slate-500">
                        {isStaff
                            ? `${ROLE_LABEL[principal.role]}${principal.terminal ? ` · signed in at ${principal.terminal.code}` : ''}`
                            : `${principal.type === 'kiosk' ? 'Self-service kiosk' : 'Kitchen display'} · ${principal.code} · signed in with its device code`}
                    </p>
                </div>
            </section>

            {can('orders.settle') && (
                <Link
                    to="/register"
                    className="flex items-center gap-4 rounded-3xl bg-slate-900 p-5 text-white shadow-sm transition hover:bg-slate-800"
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500">
                        <ScanBarcode className="h-7 w-7" />
                    </span>
                    <span>
                        <span className="block text-lg font-extrabold">Cashier Register</span>
                        <span className="block text-sm text-slate-300">Scan kiosk slips</span>
                    </span>
                </Link>
            )}

            {can('reports.view') && (
                <Link
                    to="/reports"
                    className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white">
                        <ChartColumn className="h-7 w-7" />
                    </span>
                    <span>
                        <span className="block text-lg font-extrabold text-slate-900">Shift Sales &amp; Z-Reading</span>
                        <span className="block text-sm text-slate-500">Sales, tenders, close shift, voids, export</span>
                    </span>
                </Link>
            )}

            {can('kds.use') && (
                <Link
                    to="/kitchen"
                    className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white">
                        <ChefHat className="h-7 w-7" />
                    </span>
                    <span>
                        <span className="block text-lg font-extrabold text-slate-900">Kitchen Display</span>
                        <span className="block text-sm text-slate-500">Paid orders, live — complete, recall, clear served</span>
                    </span>
                </Link>
            )}

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">What you can do here</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                    {allowed.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            {PERMISSION_LABEL[p]}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default Home;
