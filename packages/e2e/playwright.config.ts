import { defineConfig } from '@playwright/test';

// Con E2E_BASE_URL i test girano contro un ambiente già pubblicato (la preview
// della pull request). Senza, Playwright avvia `wrangler dev` su un D1 locale
// preparato con migrazioni, seed base e seed demo.
const urlEsterno = process.env.E2E_BASE_URL;
const PORTA = 8787;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: urlEsterno ?? `http://localhost:${PORTA}`,
    trace: 'off',
  },
  ...(urlEsterno
    ? {}
    : {
        webServer: {
          command: `pnpm --filter @ppu/worker dev:e2e --port ${PORTA}`,
          url: `http://localhost:${PORTA}/salute`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
