import { PropsWithChildren, Suspense } from 'react';
import App from '../../App';
import { LoadingState } from '../ui/Progress';
import Footer from './Footer';
import Header from './Header';

// Navbar on top, the page below — no sidebar (same shape as the commissary).
// Register, Reports and Admin pages use it; the kiosk and the kitchen display
// get a full-screen layout of their own when they are built.
const DefaultLayout = ({ children }: PropsWithChildren) => (
    <App>
        <div className="flex h-screen overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col">
                <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                    <Header />
                    <Suspense fallback={<LoadingState fullPage />}>
                        <div className="md:px-3 md:py-5">{children}</div>
                    </Suspense>
                    <Footer />
                </main>
            </div>
        </div>
    </App>
);

export default DefaultLayout;
