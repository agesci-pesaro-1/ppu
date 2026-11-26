import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { brandPlugin, loadBrand } from './brand.ts';

// The PWA is served by the API's Worker (ADR 0012): in development Vite
// forwards /api to `wrangler dev` (port 8787).
// Group logo, colours and name come from configuration (brand.ts).
export default defineConfig(async () => {
  const brand = await loadBrand();
  const icon = { src: `/${brand.icon.path}`, sizes: 'any', type: brand.icon.type };
  return {
    plugins: [
      svelte(),
      brandPlugin(brand),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: brand.groupName
            ? `PPU · ${brand.groupName}`
            : 'PPU — Progressione Personale Unitaria',
          short_name: 'PPU',
          description: 'Gestionale degli associati del gruppo scout',
          lang: 'it',
          start_url: '/',
          display: 'standalone',
          background_color: '#f1eef7',
          theme_color: brand.colors.primary,
          icons: [
            { ...icon, purpose: 'any' },
            { ...icon, purpose: 'maskable' },
          ],
        },
        workbox: {
          // Only the app shell is cached. Personal data (/api) never: always from
          // the network, so nothing stays on the phone.
          // Fonts: only the Latin subsets; the others download when needed.
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp}', '**/*-latin{,-ext}-*.woff2'],
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
  };
});
