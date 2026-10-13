/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'SYSGOV — Painel do Cliente',
        short_name: 'SYSGOV',
        description: 'Painel do órgão público SYSGOV, com suporte offline para vistoria de campo.',
        theme_color: '#1351B4',
        background_color: '#F8F9FA',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // O SW só faz pre-cache do app-shell (instalabilidade/carregar offline).
        // Dados offline (pacote do dia, fila de execuções) vivem no IndexedDB
        // (ver src/modules/vistoria/campo/), não em cache de resposta de API —
        // uma única fonte de verdade para o dado offline.
        navigateFallbackDenylist: [/^\/api/, /^\/sanctum/],
      },
    }),
  ],
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
