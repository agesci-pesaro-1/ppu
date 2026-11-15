import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { elencaTag } from '../src/servizi/admin/tag.ts';
import { conferma, proponi } from '../src/servizi/anteprime.ts';
import { contesto } from './aiuti.ts';

// Seed demo: tag 8 "Campo invernale 2026" (Orsolini Lorenzo 13, Rinaldi Giacomo 16),
// tag 9 "campo invernale" (Tarducci Giulia 19), squadriglie 1 Aquile e 2 Volpi,
// tag 10 "Capo squadriglia" (Rinaldi 16, che è anche nelle Volpi; Zanetti 22).

const attivi = async (tagId: number) =>
  (
    await env.DB.prepare(
      'SELECT associato_id FROM associati_tag WHERE tag_id = ? AND rimosso_il IS NULL ORDER BY associato_id',
    )
      .bind(tagId)
      .all<{ associato_id: number }>()
  ).results.map((r) => r.associato_id);

describe('revisione dei tag', () => {
  it('elenca i tag con utilizzi e stato', async () => {
    const tag = await elencaTag(contesto(), { tipo: 'evento' });
    expect(tag.map((t) => [t.id, t.stato, t.utilizzi])).toEqual([
      [9, 'libero', 1],
      [8, 'libero', 2],
    ]);
  });

  it('unisce un doppione: assegnazioni spostate, vecchio tag archiviato', async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'tag.unisci', { da_id: 9, a_id: 8 });
    expect(a.conteggio).toBe(1);
    await conferma(ctx, a.id);
    expect(await attivi(8)).toEqual([13, 16, 19]);
    expect(await attivi(9)).toEqual([]);
    const vecchio = await env.DB.prepare('SELECT stato, unito_in_id FROM tag WHERE id = 9').first();
    expect(vecchio).toEqual({ stato: 'archiviato', unito_in_id: 8 });
    // Lo storico resta: l'assegnazione chiusa esiste ancora.
    const storico = await env.DB.prepare(
      'SELECT rimosso_da FROM associati_tag WHERE tag_id = 9 AND associato_id = 19',
    ).first('rimosso_da');
    expect(storico).toBe('webmaster@example.org');
  });

  it('chi ha già il tag di destinazione non viene duplicato', async () => {
    const ctx = contesto();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO tag (id, nome, tipo_id, creato_da) VALUES (101, 'Uscita al lago', 'evento', 'x@example.org'), (102, 'uscita lago', 'evento', 'x@example.org')",
      ),
      env.DB.prepare(
        "INSERT INTO associati_tag (associato_id, tag_id, creato_da) VALUES (20, 101, 'x@example.org'), (20, 102, 'x@example.org'), (21, 102, 'x@example.org')",
      ),
    ]);
    const a = await proponi(ctx, 'tag.unisci', { da_id: 102, a_id: 101 });
    await conferma(ctx, a.id, { conteggio: 2 });
    expect(await attivi(101)).toEqual([20, 21]);
    expect(await attivi(102)).toEqual([]);
  });

  it("unire due squadriglie è un'operazione di massa: serve ripetere il conteggio", async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'tag.unisci', { da_id: 2, a_id: 1 });
    expect(a).toMatchObject({ conteggio: 3, massiva: true });
    await expect(conferma(ctx, a.id)).rejects.toMatchObject({ codice: 'richiesta_non_valida' });
    await conferma(ctx, a.id, { conteggio: 3 });
    expect(await attivi(1)).toHaveLength(6);
  });

  it("rifiuta un'unione che darebbe due tag esclusivi dello stesso tipo", async () => {
    // Rinaldi (16) ha "Capo squadriglia" e le Volpi: unendo il primo nelle Aquile avrebbe due squadriglie.
    await expect(proponi(contesto(), 'tag.unisci', { da_id: 10, a_id: 1 })).rejects.toMatchObject({
      codice: 'conflitto',
    });
  });

  it('rende ufficiale e archivia un tag, con registro', async () => {
    const ctx = contesto();
    const a = await proponi(ctx, 'tag.stato', { tag_id: 11, stato: 'ufficiale' });
    await conferma(ctx, a.id);
    expect(await env.DB.prepare('SELECT stato FROM tag WHERE id = 11').first('stato')).toBe(
      'ufficiale',
    );
    const registro = await env.DB.prepare(
      "SELECT valore_prima, valore_dopo FROM modifiche WHERE operazione = ? AND entita = 'tag'",
    )
      .bind(a.id)
      .first();
    expect(registro).toEqual({ valore_prima: '"libero"', valore_dopo: '"ufficiale"' });
  });

  it('chi non è webmaster non può unire tag', async () => {
    await expect(
      proponi(contesto({ webmaster: false, accessoCompleto: true }), 'tag.unisci', {
        da_id: 9,
        a_id: 8,
      }),
    ).rejects.toMatchObject({ codice: 'permesso_negato' });
  });
});
