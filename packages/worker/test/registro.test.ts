import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { istruzioniModifiche, nuovaOperazione, registraAccesso } from '../src/servizi/registro.ts';

describe('registro', () => {
  it('salva dato e registro nello stesso batch', async () => {
    const op = nuovaOperazione('capo.eg@example.org', 'pwa');
    await env.DB.batch([
      env.DB.prepare("UPDATE associati SET cap = '00001' WHERE id = 13"),
      ...istruzioniModifiche(env.DB, op, [
        {
          entita: 'associati',
          entitaId: 13,
          campo: 'cap',
          prima: '00000',
          dopo: '00001',
          buonaStrada: true,
        },
        {
          entita: 'associati',
          entitaId: 13,
          campo: 'note_privacy',
          prima: null,
          dopo: 'x',
          buonaStrada: false,
        },
      ]),
    ]);
    const { results } = await env.DB.prepare(
      'SELECT campo, valore_prima, valore_dopo, stato_buona_strada, canale FROM modifiche WHERE operazione = ? ORDER BY id',
    )
      .bind(op.id)
      .all();
    expect(results).toEqual([
      {
        campo: 'cap',
        valore_prima: '"00000"',
        valore_dopo: '"00001"',
        stato_buona_strada: 'da_riportare',
        canale: 'pwa',
      },
      {
        campo: 'note_privacy',
        valore_prima: 'null',
        valore_dopo: '"x"',
        stato_buona_strada: null,
        canale: 'pwa',
      },
    ]);
  });

  it('se il registro fallisce, il dato non cambia', async () => {
    const op = nuovaOperazione('capo.eg@example.org', 'pwa');
    const righe = istruzioniModifiche(env.DB, { ...op, canale: 'sconosciuto' as 'pwa' }, [
      {
        entita: 'associati',
        entitaId: 14,
        campo: 'cap',
        prima: '00000',
        dopo: '00002',
        buonaStrada: true,
      },
    ]);
    await expect(
      env.DB.batch([env.DB.prepare("UPDATE associati SET cap = '00002' WHERE id = 14"), ...righe]),
    ).rejects.toThrow();
    const cap = await env.DB.prepare('SELECT cap FROM associati WHERE id = 14').first('cap');
    expect(cap).toBe('00000');
  });

  it("il database rifiuta la conferma Buona Strada da parte dell'autore", async () => {
    await expect(
      env.DB.prepare(
        `UPDATE modifiche SET stato_buona_strada = 'riportata', confermata_da = autore_email,
           confermata_il = '2026-11-12T00:00:00Z' WHERE operazione = 'demo-op-1'`,
      ).run(),
    ).rejects.toThrow();
  });

  it('registra le letture sensibili', async () => {
    await registraAccesso(env.DB, {
      email: 'capo.rs@example.org',
      canale: 'pwa',
      entita: 'associati',
      entitaId: 25,
      campi: ['codice_fiscale'],
    });
    const r = await env.DB.prepare('SELECT campi FROM accessi WHERE email = ?')
      .bind('capo.rs@example.org')
      .first('campi');
    expect(r).toBe('["codice_fiscale"]');
  });
});
