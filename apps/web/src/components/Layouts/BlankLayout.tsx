import { PropsWithChildren, Suspense } from 'react';
import App from '../../App';
import { LoadingState } from '../ui/Progress';

const BlankLayout = ({ children }: PropsWithChildren) => {
    return (
        <App>
            <div className="flex flex-col min-h-screen">
                {/* A page's code is still loading: say so, not a blank screen. */}
                <Suspense fallback={<LoadingState fullPage />}>
                    <div className="text-black dark:text-white-dark min-h-screen">{children} </div>
                </Suspense>
            </div>
        </App>
    );
};

export default BlankLayout;
