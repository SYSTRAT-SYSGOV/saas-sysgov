/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sysgov/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@sysgov/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/apps/api/**',
        '**/vendor/**',
        '**/storage/**',
        '**/dist/**',
        '**/.claude/**',
        '**/.agents/**',
        '**/openspec/**',
      ],
    },
    proxy: {
      // Em Docker, aponte VITE_API_PROXY_TARGET para o serviço da API
      // (ex.: http://api:8000), já que 'localhost' dentro do container
      // se refere ao próprio container, não ao host nem a outros serviços.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        headers: { Connection: 'close' },
      },
      '/sanctum': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        headers: { Connection: 'close' },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000,
  },
});
