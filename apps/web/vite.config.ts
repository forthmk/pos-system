import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), react()],
    base: '',
    server: {
        host: true,
        // VITE_API_URL=/api: the browser calls this server, which passes /api on
        // to the API (port 3000). Phones on the Wi-Fi then only need this address.
        proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
    },
    optimizeDeps: {
        exclude: ['@shared/model', '@shared/axios', '@shared/api', '@shared/utils'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared/model': path.resolve(__dirname, '../../packages/shared/model/index.ts'),
            '@shared/axios': path.resolve(__dirname, '../../packages/shared/axios/index.ts'),
            '@shared/api': path.resolve(__dirname, '../../packages/shared/api/index.ts'),
            '@shared/utils': path.resolve(__dirname, '../../packages/shared/utils/index.ts'),
        },
    },
});
