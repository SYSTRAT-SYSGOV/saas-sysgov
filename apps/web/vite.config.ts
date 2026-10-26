import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// A versão do sistema vem do package.json da raiz (fonte única, igual no admin e no cliente).
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));

export default defineConfig(() => {
  return {
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [react() as any, tailwindcss() as any],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@sysgov/ui': path.resolve(__dirname, '../../packages/ui/src'),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Em Docker, aponte VITE_API_PROXY_TARGET para o serviço da API
        // (ex.: http://api:8000), já que 'localhost' dentro do container
        // se refere ao próprio container, não ao host nem a outros serviços.
        // Não usar VITE_API_URL aqui: essa variável também é lida pelo
        // código do navegador (config/env.ts) e um valor como
        // 'http://api:8000' não resolve fora da rede Docker.
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          headers: { Connection: 'close' },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      testTimeout: 15000,
    },
  };
});
