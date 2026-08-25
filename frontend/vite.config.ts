
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vitePluginImp from 'vite-plugin-imp';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    build: {
        outDir: '../dist',
        emptyOutDir: true
    },
    // Resolved against the root (src/), so this is src/public. Holds the map
    // tile pyramid, which is copied to dist as-is and served from /tiles
    publicDir: 'public',
    plugins: [
        react(),
        tsconfigPaths(),
        vitePluginImp({
            libList: [
                {
                    libName: 'antd',
                    style: (name: any) => `antd/es/${name}/style`,
                },
            ],
        }),
    ],
    resolve: {
        alias: [
            { find: /^~/, replacement: '' },
        ],
    },
    css: {
        preprocessorOptions: {
            less: {
                javascriptEnabled: true,
                modifyVars: {
                    'primary-color': '#c28b00',
                    'dark': true
                },
            },
        },
    },
});