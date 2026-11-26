import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './tailwind.css';
import './i18n';
import { AlertProvider, OverlayProvider, ToastProvider, TooltipProvider } from '@pikoloo/darwin-ui';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'sileo';
import router from './router/index';
import store from './store/index';
import { AuthProvider } from './providers/AuthProvider';

// Same provider stack as the commissary: darwin-ui overlays / toasts,
// TanStack Query for server data, Redux for theme settings only, sileo toasts.
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <OverlayProvider>
            <ToastProvider>
                <AlertProvider>
                    <TooltipProvider>
                        <QueryClientProvider client={queryClient}>
                            <AuthProvider>
                                <Suspense fallback={null}>
                                    <Provider store={store}>
                                        <Toaster
                                            position="top-center"
                                            options={{ fill: '#1a1a1a', styles: { title: 'text-white!', description: 'text-white/75!' } }}
                                        />
                                        <RouterProvider router={router} />
                                    </Provider>
                                </Suspense>
                            </AuthProvider>
                        </QueryClientProvider>
                    </TooltipProvider>
                </AlertProvider>
            </ToastProvider>
        </OverlayProvider>
    </React.StrictMode>,
);
