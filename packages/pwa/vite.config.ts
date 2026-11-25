import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The PWA is served by the API's Worker (ADR 0012): in development Vite
// forwards /api to `wrangler dev` (port 8787).
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'PPU — Progressione Personale Unitaria',
        short_name: 'PPU',
        description: 'Gestionale degli associati del gruppo scout',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f7f4',
        theme_color: '#2f5d3a',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Only the app shell is cached. Personal data (/api) never: always from
        // the network, so nothing stays on the phone.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/mcp/,
          /^\/oauth\//,
          /^\/authorize/,
          /^\/\.well-known\//,
          /^\/health/,
        ],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://localhost:8787', '/health': 'http://localhost:8787' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
