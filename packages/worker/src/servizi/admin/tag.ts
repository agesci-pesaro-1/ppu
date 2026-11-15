// Revisione dei tag da parte del webmaster (ADR 0007): elenco con utilizzi,
// cambio di stato (libero, ufficiale, archiviato) e unione di due tag.

import { z } from 'zod';
import { ErrorePpu } from '../../errori.ts';
import { registraTipo } from '../anteprime.ts';
import type { Contesto } from '../contesto.ts';
import type { RigaModifica } from '../registro.ts';
import { analizza } from '../valida.ts';
import { richiediWebmaster } from './utenti.ts';

type StatoTag = 'libero' | 'ufficiale' | 'archiviato';

interface RigaTag {
  id: number;
  nome: string;
  tipo_id: string;
  stato: StatoTag;
  anno_scout_id: number | null;
  anno: string | null;
  esclusivo: number;
  unito_in_id: number | null;
  utilizzi: number;
}

export interface VoceTag {
  id: number;
  nome: string;
  tipo: string;
  stato: StatoTag;
  anno: string | null;
  esclusivo: boolean;
  utilizzi: number;
  unitoIn: number | null;
}

const SELECT_TAG = `
  SELECT t.id, t.nome, t.tipo_id, t.stato, t.anno_scout_id, t.esclusivo, t.unito_in_id,
         (SELECT nome FROM anni_scout s WHERE s.id = t.anno_scout_id) AS anno,
         (SELECT count(*) FROM associati_tag at WHERE at.tag_id = t.id AND at.rimosso_il IS NULL) AS utilizzi
    FROM tag t`;

const voce = (r: RigaTag): VoceTag => ({
  id: r.id,
  nome: r.nome,
  tipo: r.tipo_id,
  stato: r.stato,
  anno: r.anno,
  esclusivo: r.esclusivo === 1,
  utilizzi: r.utilizzi,
  unitoIn: r.unito_in_id,
});

export async function elencaTag(
  ctx: Contesto,
  filtro: { stato?: StatoTag | undefined; tipo?: string | undefined } = {},
): Promise<VoceTag[]> {
  richiediWebmaster(ctx);
  const { results } = await ctx.db
    .prepare(
      `${SELECT_TAG} WHERE (?1 IS NULL OR t.stato = ?1) AND (?2 IS NULL OR t.tipo_id = ?2)
       ORDER BY t.tipo_id, lower(t.nome)`,
    )
    .bind(filtro.stato ?? null, filtro.tipo ?? null)
    .all<RigaTag>();
  return results.map(voce);
}

async function caricaTag(ctx: Contesto, id: number): Promise<RigaTag> {
  const t = await ctx.db.prepare(`${SELECT_TAG} WHERE t.id = ?`).bind(id).first<RigaTag>();
  if (!t) throw new ErrorePpu('non_trovato', `Tag ${id} inesistente.`);
  return t;
}

const schemaStato = z.strictObject({
  tag_id: z.number().int().positive(),
  stato: z.enum(['libero', 'ufficiale', 'archiviato']),
});

/** Rende un tag ufficiale, lo archivia o lo riporta a libero. */
export const cambiaStatoTag = registraTipo<z.infer<typeof schemaStato>>({
  tipo: 'tag.stato',
  valida: (p) => analizza(schemaStato, p),
  async pianifica(ctx, p) {
    richiediWebmaster(ctx);
    const t = await caricaTag(ctx, p.tag_id);
    if (t.unito_in_id !== null) {
      throw new ErrorePpu(
        'conflitto',
        `Il tag "${t.nome}" è stato unito a un altro e resta archiviato.`,
      );
    }
    if (t.stato === 'archiviato' && p.stato !== 'archiviato') {
      // Riattivarlo non deve creare un doppione tra i tag attivi.
      const doppione = await ctx.db
        .prepare(
          `SELECT 1 FROM tag WHERE id <> ? AND stato <> 'archiviato' AND lower(nome) = lower(?)
             AND tipo_id = ? AND coalesce(anno_scout_id, 0) = coalesce(?, 0)`,
        )
        .bind(t.id, t.nome, t.tipo_id, t.anno_scout_id)
        .first();
      if (doppione)
        throw new ErrorePpu('conflitto', `Esiste già un tag attivo "${t.nome}" dello stesso tipo.`);
    }
    const righe: RigaModifica[] =
      t.stato === p.stato
        ? []
        : [
            {
              entita: 'tag',
              entitaId: t.id,
              campo: 'stato',
              prima: t.stato,
              dopo: p.stato,
              buonaStrada: false,
            },
          ];
    return {
      descrizione: `Tag "${t.nome}": ${t.stato} → ${p.stato}${t.utilizzi ? ` (${t.utilizzi} utilizzi restano nello storico)` : ''}.`,
      righe,
      istruzioni: [ctx.db.prepare('UPDATE tag SET stato = ? WHERE id = ?').bind(p.stato, t.id)],
      conteggio: 1,
    };
  },
});

const schemaUnisci = z
  .strictObject({
    da_id: z.number().int().positive(),
    a_id: z.number().int().positive(),
  })
  .refine((p) => p.da_id !== p.a_id, 'un tag non si unisce a se stesso');

interface Assegnazione {
  id: number;
  associato_id: number;
  anno_scout_id: number | null;
  nota: string | null;
  gia_nel_destinazione: number;
  conflitto_esclusivo: number;
}

/**
 * Unisce il tag `da` nel tag `a`: le assegnazioni attive passano ad `a`
 * (chiudendo le vecchie, che restano nello storico), `da` viene archiviato con
 * il riferimento ad `a`. Se `a` è esclusivo, nessuno deve finire con due tag
 * di quel tipo nello stesso anno.
 */
export const unisciTag = registraTipo<z.infer<typeof schemaUnisci>>({
  tipo: 'tag.unisci',
  valida: (p) => analizza(schemaUnisci, p),
  async pianifica(ctx, p) {
    richiediWebmaster(ctx);
    const da = await caricaTag(ctx, p.da_id);
    const a = await caricaTag(ctx, p.a_id);
    if (da.stato === 'archiviato')
      throw new ErrorePpu('conflitto', `Il tag "${da.nome}" è già archiviato.`);
    if (a.stato === 'archiviato')
      throw new ErrorePpu('conflitto', `Il tag "${a.nome}" è archiviato.`);

    const { results: assegnazioni } = await ctx.db
      .prepare(
        `SELECT at.id, at.associato_id, at.anno_scout_id, at.nota,
                EXISTS (SELECT 1 FROM associati_tag x
                         WHERE x.tag_id = ?2 AND x.associato_id = at.associato_id AND x.rimosso_il IS NULL
                           AND coalesce(x.anno_scout_id, 0) = coalesce(at.anno_scout_id, 0)) AS gia_nel_destinazione,
                (?3 = 1 AND EXISTS (
                   SELECT 1 FROM associati_tag x JOIN tag t ON t.id = x.tag_id
                    WHERE x.associato_id = at.associato_id AND x.rimosso_il IS NULL
                      AND x.tag_id NOT IN (?1, ?2) AND t.tipo_id = ?4
                      AND coalesce(x.anno_scout_id, 0) = coalesce(at.anno_scout_id, 0))) AS conflitto_esclusivo
           FROM associati_tag at
          WHERE at.tag_id = ?1 AND at.rimosso_il IS NULL
          ORDER BY at.id`,
      )
      .bind(da.id, a.id, a.esclusivo, a.tipo_id)
      .all<Assegnazione>();

    const conflitti = assegnazioni.filter((x) => x.conflitto_esclusivo === 1);
    if (conflitti.length > 0) {
      throw new ErrorePpu(
        'conflitto',
        `Unione impossibile: ${conflitti.length} associati avrebbero due tag esclusivi di tipo "${a.tipo_id}" nello stesso anno.`,
      );
    }

    const adesso = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
    const chiudi = ctx.db.prepare(
      `UPDATE associati_tag SET rimosso_il = ${adesso}, rimosso_da = ? WHERE id = ? AND rimosso_il IS NULL`,
    );
    const crea = ctx.db.prepare(
      'INSERT INTO associati_tag (associato_id, tag_id, anno_scout_id, nota, creato_da) VALUES (?, ?, ?, ?, ?)',
    );

    const righe: RigaModifica[] = [];
    const istruzioni: D1PreparedStatement[] = [];
    for (const x of assegnazioni) {
      istruzioni.push(chiudi.bind(ctx.utente.email, x.id));
      if (x.gia_nel_destinazione !== 1) {
        istruzioni.push(crea.bind(x.associato_id, a.id, x.anno_scout_id, x.nota, ctx.utente.email));
      }
      righe.push({
        entita: 'associati_tag',
        entitaId: x.associato_id,
        campo: 'tag_id',
        prima: da.id,
        dopo: a.id,
        buonaStrada: false,
      });
    }
    istruzioni.push(
      ctx.db
        .prepare("UPDATE tag SET stato = 'archiviato', unito_in_id = ? WHERE id = ?")
        .bind(a.id, da.id),
    );
    righe.push(
      {
        entita: 'tag',
        entitaId: da.id,
        campo: 'stato',
        prima: da.stato,
        dopo: 'archiviato',
        buonaStrada: false,
      },
      {
        entita: 'tag',
        entitaId: da.id,
        campo: 'unito_in_id',
        prima: null,
        dopo: a.id,
        buonaStrada: false,
      },
    );

    return {
      descrizione: `Unisce "${da.nome}" in "${a.nome}": ${assegnazioni.length} assegnazioni spostate, "${da.nome}" archiviato.`,
      righe,
      istruzioni,
      conteggio: Math.max(assegnazioni.length, 1),
    };
  },
});
