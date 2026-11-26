import { NavLink } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

// Menu | Reports — the register's two screens (UI reference: the switch at
// the top right of "Cashier Register" and "Sales Analytics & Shift
// Z-Reading Reports"). Reports shows only for who may see it.

const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-4 py-1.5 text-sm font-bold transition ${isActive ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`;

const RegisterTabs = () => {
    const { can } = usePermission();
    return (
        <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200" aria-label="Register screens">
            {can('orders.settle') && (
                <NavLink to="/register" className={tab}>
                    Menu
                </NavLink>
            )}
            {can('reports.view') && (
                <NavLink to="/reports" className={tab}>
                    Reports
                </NavLink>
            )}
        </nav>
    );
};

export default RegisterTabs;
