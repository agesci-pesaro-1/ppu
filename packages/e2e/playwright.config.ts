import { defineConfig } from '@playwright/test';

// With E2E_BASE_URL the tests run against an already deployed environment (the
// pull request's preview). Without it, Playwright starts `wrangler dev` on a
// local D1 set up with the migrations, the example configuration, seed/base
// and the demo data.
const externalUrl = process.env.E2E_BASE_URL;
const PORT = 8787;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: externalUrl ?? `http://localhost:${PORT}`,
    trace: 'off',
    // Chromium already installed elsewhere (e.g. a development environment with
    // a different Playwright version): PW_CHROMIUM_PATH=/path/to/chrome
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  ...(externalUrl
    ? {}
    : {
        webServer: {
          command: `pnpm --filter @ppu/worker dev:e2e --port ${PORT}`,
          url: `http://localhost:${PORT}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
