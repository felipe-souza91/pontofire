import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// O app roda atrás de /app/ e compila para /public/app, que o Firebase Hosting
// serve. A landing (SEO) fica na raiz de /public; ver firebase.json.
export default defineConfig({
  base: '/app/',
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      filename: 'sw.js',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Ponto FIRE',
        short_name: 'Ponto FIRE',
        description: 'Descubra a data exata da sua independência financeira.',
        lang: 'pt-BR',
        // Instala como app dentro de /app (escopo do PWA).
        scope: '/app/',
        start_url: '/app/',
        display: 'standalone',
        background_color: '#0C0F2E',
        theme_color: '#0C0F2E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/app/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
