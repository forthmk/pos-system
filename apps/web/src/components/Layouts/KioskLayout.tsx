import { PropsWithChildren, Suspense } from 'react';
import App from '../../App';
import { LoadingState } from '../ui/Progress';

// Full screen, no navbar: the self-service kiosk and the kitchen display.
// The page draws its own top bar.
const KioskLayout = ({ children }: PropsWithChildren) => (
    <App>
        <Suspense fallback={<LoadingState fullPage />}>
            <div className="min-h-dvh select-none bg-[#FFF8F0] text-slate-900">{children}</div>
        </Suspense>
    </App>
);

export default KioskLayout;
