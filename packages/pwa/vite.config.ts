import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// La PWA è servita dallo stesso Worker dell'API (ADR 0014): in sviluppo Vite
// inoltra /api a `wrangler dev` (porta 8787).
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icona.svg'],
      manifest: {
        name: 'PPU — Progressione Personale Unitaria',
        short_name: 'PPU',
        description: 'Gestionale degli associati del gruppo scout',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f7f4',
        theme_color: '#2f5d3a',
        icons: [{ src: '/icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Solo la "scocca" dell'app va in cache. I dati personali (/api) mai:
        // sempre dalla rete, così nulla resta sul telefono.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/mcp/,
          /^\/oauth\//,
          /^\/authorize/,
          /^\/\.well-known\//,
          /^\/salute/,
        ],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://localhost:8787', '/salute': 'http://localhost:8787' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
