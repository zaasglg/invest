import { fileURLToPath } from 'node:url';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            path: 'resources/js/generated',
        }),
    ],

    resolve: {
        alias: [
            {
                find: /^@\/routes(?=\/|$)/,
                replacement: fileURLToPath(
                    new URL('./resources/js/generated/routes', import.meta.url),
                ),
            },
            {
                find: /^@\/actions(?=\/|$)/,
                replacement: fileURLToPath(
                    new URL(
                        './resources/js/generated/actions',
                        import.meta.url,
                    ),
                ),
            },
            {
                find: /^@\/wayfinder(?=\/|$)/,
                replacement: fileURLToPath(
                    new URL(
                        './resources/js/generated/wayfinder',
                        import.meta.url,
                    ),
                ),
            },
            {
                find: '@',
                replacement: fileURLToPath(
                    new URL('./resources/js', import.meta.url),
                ),
            },
        ],
    },

    esbuild: {
        jsx: 'automatic',
    },
});
