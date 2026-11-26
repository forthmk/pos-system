import { Link } from 'react-router-dom';

const Error404 = () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#FFF8F0] px-4 text-center">
        <p className="text-6xl font-extrabold text-orange-500">404</p>
        <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
        <Link to="/home" className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
            Go home
        </Link>
    </div>
);

export default Error404;
