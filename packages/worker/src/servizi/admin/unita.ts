// Gestione delle unità (ADR 0013). Si aggiungono, rinominano, attivano o
// disattivano; non si cancellano mai. Solo webmaster.

import { z } from 'zod';
import { ErrorePpu } from '../../errori.ts';
import { registraTipo } from '../anteprime.ts';
import type { Contesto } from '../contesto.ts';
import type { RigaModifica } from '../registro.ts';
import { analizza } from '../valida.ts';
import { richiediWebmaster } from './utenti.ts';

export interface VoceUnita {
  id: string;
  nome: string;
  branca: string;
  attiva: boolean;
  ordine: number;
  associatiAttivi: number;
  capi: number;
}

export async function elencaUnita(ctx: Contesto): Promise<VoceUnita[]> {
  richiediWebmaster(ctx);
  const { results } = await ctx.db
    .prepare(
      `SELECT u.id, u.nome, u.branca_id, u.attiva, u.ordine,
              (SELECT count(*) FROM associati a WHERE a.unita_id = u.id AND a.stato = 'attivo') AS associati,
              (SELECT count(*) FROM utenti_unita uu WHERE uu.unita_id = u.id) AS capi
         FROM unita u ORDER BY u.ordine, u.id`,
    )
    .all<{
      id: string;
      nome: string;
      branca_id: string;
      attiva: number;
      ordine: number;
      associati: number;
      capi: number;
    }>();
  return results.map((r) => ({
    id: r.id,
    nome: r.nome,
    branca: r.branca_id,
    attiva: r.attiva === 1,
    ordine: r.ordine,
    associatiAttivi: r.associati,
    capi: r.capi,
  }));
}

const schemaImpostaUnita = z.strictObject({
  id: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, 'usa lettere minuscole, cifre e trattini bassi'),
  nome: z.string().trim().min(1).optional(),
  branca_id: z.string().min(1).optional(),
  attiva: z.boolean().optional(),
  ordine: z.number().int().optional(),
});
export type ImpostaUnita = z.infer<typeof schemaImpostaUnita>;

type CampoUnita = 'nome' | 'branca_id' | 'attiva' | 'ordine';
const CAMPI: CampoUnita[] = ['nome', 'branca_id', 'attiva', 'ordine'];

/** Aggiunge un'unità o ne cambia nome, branca, ordine o stato attivo. */
export const impostaUnita = registraTipo<ImpostaUnita>({
  tipo: 'unita.imposta',
  valida: (p) => analizza(schemaImpostaUnita, p),
  async pianifica(ctx, p) {
    richiediWebmaster(ctx);
    const attuale = await ctx.db
      .prepare('SELECT nome, branca_id, attiva, ordine FROM unita WHERE id = ?')
      .bind(p.id)
      .first<{ nome: string; branca_id: string; attiva: number; ordine: number }>();

    if (p.branca_id !== undefined) {
      const branca = await ctx.db
        .prepare('SELECT 1 FROM branche WHERE id = ?')
        .bind(p.branca_id)
        .first();
      if (!branca)
        throw new ErrorePpu('richiesta_non_valida', `Branca inesistente: ${p.branca_id}.`);
    }

    if (!attuale) {
      if (!p.nome || !p.branca_id) {
        throw new ErrorePpu('richiesta_non_valida', 'Per una nuova unità servono nome e branca.');
      }
      const nuova = {
        nome: p.nome,
        branca_id: p.branca_id,
        attiva: p.attiva ?? true,
        ordine: p.ordine ?? 0,
      };
      return {
        descrizione: `Aggiunge l'unità "${nuova.nome}".`,
        righe: [
          {
            entita: 'unita',
            entitaId: p.id,
            campo: null,
            prima: null,
            dopo: nuova,
            buonaStrada: false,
          },
        ],
        istruzioni: [
          ctx.db
            .prepare(
              'INSERT INTO unita (id, nome, branca_id, attiva, ordine) VALUES (?, ?, ?, ?, ?)',
            )
            .bind(p.id, nuova.nome, nuova.branca_id, nuova.attiva ? 1 : 0, nuova.ordine),
        ],
        conteggio: 1,
      };
    }

    const prima = { ...attuale, attiva: attuale.attiva === 1 };
    const dopo = {
      nome: p.nome ?? prima.nome,
      branca_id: p.branca_id ?? prima.branca_id,
      attiva: p.attiva ?? prima.attiva,
      ordine: p.ordine ?? prima.ordine,
    };
    const righe: RigaModifica[] = CAMPI.filter((c) => prima[c] !== dopo[c]).map((c) => ({
      entita: 'unita',
      entitaId: p.id,
      campo: c,
      prima: prima[c],
      dopo: dopo[c],
      buonaStrada: false,
    }));

    let descrizione = `Aggiorna l'unità "${prima.nome}".`;
    if (prima.attiva && !dopo.attiva) {
      const n = await ctx.db
        .prepare("SELECT count(*) AS n FROM associati WHERE unita_id = ? AND stato = 'attivo'")
        .bind(p.id)
        .first<number>('n');
      descrizione = `Disattiva l'unità "${prima.nome}"${n ? ` (ha ancora ${n} associati attivi)` : ''}.`;
    }

    return {
      descrizione,
      righe,
      istruzioni: [
        ctx.db
          .prepare('UPDATE unita SET nome = ?, branca_id = ?, attiva = ?, ordine = ? WHERE id = ?')
          .bind(dopo.nome, dopo.branca_id, dopo.attiva ? 1 : 0, dopo.ordine, p.id),
      ],
      conteggio: 1,
    };
  },
});
