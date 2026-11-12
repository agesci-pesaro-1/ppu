import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { elencaUtenti } from '../src/servizi/admin/utenti.ts';
import { annulla, conferma, DURATA_ANTEPRIMA_MS, proponi } from '../src/servizi/anteprime.ts';
import { contesto } from './aiuti.ts';

const nuovoCapo = { email: 'nuovo.capo@example.org', unita: ['lupetti'], buona_strada: true };
// Lo stato del database resta tra i test dello stesso file: ogni test usa un'email sua.
let n = 0;
const capo = () => ({ email: `capo.prova${++n}@example.org`, unita: ['guide'] });

describe('anteprima e conferma', () => {
  it('chi non è webmaster non può né leggere né proporre', async () => {
    const ctx = contesto({
      email: 'capogruppo@example.org',
      webmaster: false,
      accessoCompleto: true,
    });
    await expect(elencaUtenti(ctx)).rejects.toMatchObject({ codice: 'permesso_negato' });
    await expect(proponi(ctx, 'utente.imposta', nuovoCapo)).rejects.toMatchObject({
      codice: 'permesso_negato',
    });
  });

  it("l'anteprima non modifica nulla; la conferma applica dato e registro", async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'utente.imposta', nuovoCapo);
    expect(a).toMatchObject({ tipo: 'utente.imposta', conteggio: 1, massiva: false });
    expect(a.modifiche).toEqual([
      {
        entita: 'utenti',
        entitaId: 'nuovo.capo@example.org',
        campo: null,
        prima: null,
        dopo: {
          accesso_completo: false,
          buona_strada: true,
          webmaster: false,
          beta_tester: false,
          escluso: false,
          unita: ['lupetti'],
          associato_id: null,
        },
      },
    ]);
    const primaDellaConferma = await env.DB.prepare('SELECT 1 FROM utenti WHERE email = ?')
      .bind('nuovo.capo@example.org')
      .first();
    expect(primaDellaConferma).toBeNull();

    await conferma(ctx, a.id);

    const riga = await env.DB.prepare(
      `SELECT u.buona_strada, group_concat(uu.unita_id) AS unita FROM utenti u
         JOIN utenti_unita uu ON uu.email = u.email WHERE u.email = ? GROUP BY u.email`,
    )
      .bind('nuovo.capo@example.org')
      .first();
    expect(riga).toEqual({ buona_strada: 1, unita: 'lupetti' });
    const registro = await env.DB.prepare(
      'SELECT autore_email, canale, entita, stato_buona_strada FROM modifiche WHERE operazione = ?',
    )
      .bind(a.id)
      .all();
    expect(registro.results).toEqual([
      {
        autore_email: 'webmaster@example.org',
        canale: 'admin',
        entita: 'utenti',
        stato_buona_strada: null,
      },
    ]);
  });

  it('una seconda conferma viene rifiutata', async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'utente.imposta', {
      email: 'capo.lupetti@example.org',
      beta_tester: true,
    });
    await conferma(ctx, a.id);
    await expect(conferma(ctx, a.id)).rejects.toMatchObject({ codice: 'anteprima_non_valida' });
  });

  it("un altro utente non può confermare l'anteprima", async () => {
    const a = await proponi(contesto(), 'utente.imposta', capo());
    const altro = contesto({ email: 'altro.webmaster@example.org' });
    await expect(conferma(altro, a.id)).rejects.toMatchObject({ codice: 'non_trovato' });
  });

  it("un'anteprima scaduta non si conferma", async () => {
    const inizio = new Date('2026-11-12T10:00:00Z');
    const a = await proponi(contesto({}, inizio), 'utente.imposta', capo());
    const dopo = new Date(inizio.getTime() + DURATA_ANTEPRIMA_MS + 1000);
    await expect(conferma(contesto({}, dopo), a.id)).rejects.toMatchObject({
      codice: 'anteprima_non_valida',
    });
    const stato = await env.DB.prepare('SELECT stato FROM anteprime WHERE id = ?')
      .bind(a.id)
      .first('stato');
    expect(stato).toBe('scaduta');
  });

  it("se i dati cambiano dopo l'anteprima, la conferma viene rifiutata", async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'utente.imposta', {
      email: 'capo.lupetti@example.org',
      unita: ['coccinelle'],
    });
    await env.DB.prepare(
      "INSERT INTO utenti_unita (email, unita_id) VALUES ('capo.lupetti@example.org', 'clan')",
    ).run();
    await expect(conferma(ctx, a.id)).rejects.toMatchObject({ codice: 'anteprima_non_valida' });
  });

  it('i permessi si ricontrollano alla conferma', async () => {
    const a = await proponi(contesto(), 'utente.imposta', capo());
    // Stesso autore, ma nel frattempo ha perso il ruolo di webmaster.
    await expect(conferma(contesto({ webmaster: false }), a.id)).rejects.toMatchObject({
      codice: 'permesso_negato',
    });
  });

  it("un'operazione annullata non si conferma", async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'utente.imposta', capo());
    await annulla(ctx, a.id);
    await expect(conferma(ctx, a.id)).rejects.toMatchObject({ codice: 'anteprima_non_valida' });
  });

  it("non si può togliere il ruolo all'ultimo webmaster", async () => {
    await expect(
      proponi(contesto(), 'utente.imposta', { email: 'webmaster@example.org', webmaster: false }),
    ).rejects.toMatchObject({ codice: 'conflitto' });
  });

  it('rifiuta email fuori dominio e unità inesistenti', async () => {
    await expect(
      proponi(contesto(), 'utente.imposta', { email: 'x@altrodominio.org' }),
    ).rejects.toMatchObject({ codice: 'richiesta_non_valida' });
    await expect(
      proponi(contesto(), 'utente.imposta', { email: 'x@example.org', unita: ['inesistente'] }),
    ).rejects.toMatchObject({ codice: 'richiesta_non_valida' });
  });

  it('le unità si aggiungono e si disattivano, mai si cancellano', async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'unita.imposta', {
      id: 'branco_misto',
      nome: 'Branco misto',
      branca_id: 'lc',
    });
    await conferma(ctx, a.id);
    const b = await proponi(ctx, 'unita.imposta', { id: 'coccinelle', attiva: false });
    expect(b.descrizione).toMatch(/associati attivi/);
    await conferma(ctx, b.id);
    const righe = await env.DB.prepare(
      "SELECT id, attiva FROM unita WHERE id IN ('branco_misto', 'coccinelle') ORDER BY id",
    ).all();
    expect(righe.results).toEqual([
      { id: 'branco_misto', attiva: 1 },
      { id: 'coccinelle', attiva: 0 },
    ]);
  });
});
