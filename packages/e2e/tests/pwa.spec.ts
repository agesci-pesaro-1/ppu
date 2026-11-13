import { devices, expect, test } from '@playwright/test';

// Test dell'interfaccia (PWA) con i dati inventati del seed demo, nella modalità
// di test: il login è la schermata "Scegli un ruolo".

const CARTELLA_SCREENSHOT = process.env.E2E_SCREENSHOT_DIR;

// Telefono: i capi usano PPU soprattutto da lì.
test.use({ ...devices['Pixel 7'] });

test.describe('PWA', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('scelta del ruolo, elenco, scheda', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
    await page.getByRole('button', { name: /capo\.lupetti@example\.org/ }).click();

    // Elenco con i filtri per unità
    await expect(page.getByText('capo.lupetti@example.org')).toBeVisible();
    await expect(page.getByText('Anteprima con dati inventati')).toBeVisible();
    await page.getByRole('button', { name: /^Esploratori/ }).click();
    await expect(page.getByText('6 associati')).toBeVisible();
    await page.getByRole('button', { name: /^Tutte/ }).click();

    await page.getByRole('searchbox').fill('arcangeli emma');
    await expect(page.getByText('1 associato')).toBeVisible();
    if (CARTELLA_SCREENSHOT) {
      await page.getByRole('searchbox').fill('');
      await expect(page.getByText(/\d+ associati/)).toBeVisible();
      await page.screenshot({ path: `${CARTELLA_SCREENSHOT}/screenshot-pwa-elenco.png` });
      await page.getByRole('searchbox').fill('arcangeli emma');
      await expect(page.getByText('1 associato')).toBeVisible();
    }
    await page.getByRole('link', { name: /Arcangeli/ }).click();

    // Scheda: contatti dei genitori sì, codici fiscali mai
    await expect(page.getByRole('heading', { name: 'Emma Arcangeli' })).toBeVisible();
    await expect(page.getByText('Genitori e tutori')).toBeVisible();
    await expect(page.getByText('Figlio/a di')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/DEMO\d|DEMOT/);
    if (CARTELLA_SCREENSHOT) {
      await page.screenshot({ path: `${CARTELLA_SCREENSHOT}/screenshot-pwa-scheda.png` });
      await page.screenshot({
        path: `${CARTELLA_SCREENSHOT}/screenshot-pwa-scheda-intera.png`,
        fullPage: true,
      });
    }

    // Link alla scheda del padre, che è anche capo
    await page.getByRole('link', { name: 'Stefano Arcangeli' }).click();
    await expect(page.getByRole('heading', { name: 'Stefano Arcangeli' })).toBeVisible();

    // Cambio utente
    await page.getByRole('button', { name: 'cambia utente' }).click();
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
  });

  test('un account escluso non entra', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /segreteria@example\.org/ }).click();
    await expect(page.getByRole('alert')).toContainText('non ha accesso');
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
  });

  test('la schermata di scelta è il fallback di ogni percorso della PWA', async ({ page }) => {
    await page.goto('/una/pagina/qualsiasi');
    await expect(page.getByRole('heading', { name: 'Scegli un ruolo' })).toBeVisible();
  });

  test('il manifest della PWA è servito', async ({ request }) => {
    const r = await request.get('/manifest.webmanifest');
    expect(r.status()).toBe(200);
    expect((await r.json()).short_name).toBe('PPU');
  });
});
