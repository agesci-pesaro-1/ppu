import { devices, expect, test } from '@playwright/test';

// UI (PWA) tests with the fake demo data, in test mode: the login is the
// "Scegli un ruolo" screen.

const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

// Phone: leaders use PPU mostly from there.
test.use({ ...devices['Pixel 7'] });

test.describe('PWA', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('role choice, list, card', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
    await page.getByRole('button', { name: /capo\.lupetti@example\.org/ }).click();

    // List with the unit filters
    await expect(page.getByText('capo.lupetti@example.org')).toBeVisible();
    await expect(page.getByText('Anteprima con dati inventati')).toBeVisible();
    await page.getByRole('button', { name: /^Esploratori/ }).click();
    await expect(page.getByText(/^\d+ associati$/)).toBeVisible();
    await page.getByRole('button', { name: /^Tutte/ }).click();

    await page.getByRole('searchbox').fill('arcangeli emma');
    await expect(page.getByText('1 associato')).toBeVisible();
    if (SCREENSHOT_DIR) {
      await page.getByRole('searchbox').fill('');
      await expect(page.getByText(/\d+ associati/)).toBeVisible();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/screenshot-pwa-list.png` });
      await page.getByRole('searchbox').fill('arcangeli emma');
      await expect(page.getByText('1 associato')).toBeVisible();
    }
    await page.getByRole('link', { name: /Arcangeli/ }).click();

    // Card: parents' contacts yes, tax codes never
    await expect(page.getByRole('heading', { name: 'Emma Arcangeli' })).toBeVisible();
    await expect(page.getByText('Genitori e tutori')).toBeVisible();
    await expect(page.getByText('Figlio/a di')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/DEMO\d|DEMOT/);
    // Unit history: every entry shows both the scout year and the unit
    const history = page
      .locator('.card')
      .filter({ has: page.getByRole('heading', { name: 'Storico unità' }) })
      .getByRole('listitem');
    await expect(history.first()).toBeVisible();
    for (const item of await history.all()) {
      await expect(item).toHaveText(/^\d{4}\/\d{2} · \S/);
    }
    if (SCREENSHOT_DIR) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/screenshot-pwa-card.png` });
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/screenshot-pwa-card-full.png`,
        fullPage: true,
      });
    }

    // Link to the father's card, who is also a leader
    await page.getByRole('link', { name: 'Stefano Arcangeli' }).click();
    await expect(page.getByRole('heading', { name: 'Stefano Arcangeli' })).toBeVisible();

    // Switch user
    await page.getByRole('button', { name: 'cambia utente' }).click();
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
  });

  test('an excluded account does not get in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /segreteria@example\.org/ }).click();
    await expect(page.getByRole('alert')).toContainText('non ha accesso');
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
  });

  test('an account without a row in utenti is not enabled', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /nuovo\.capo@example\.org/ }).click();
    await expect(page.getByRole('alert')).toContainText('Non sei ancora abilitato');
  });

  test('the choice screen is the fallback of every PWA path', async ({ page }) => {
    await page.goto('/any/path/at/all');
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
  });

  test('the PWA manifest is served', async ({ request }) => {
    const r = await request.get('/manifest.webmanifest');
    expect(r.status()).toBe(200);
    expect((await r.json()).short_name).toBe('PPU');
  });
});
