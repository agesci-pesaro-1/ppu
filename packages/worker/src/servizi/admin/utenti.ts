// Gestione della tabella utenti (unità e ruoli dei capi). Solo webmaster.

import { z } from 'zod';
import { ErrorePpu } from '../../errori.ts';
import { emailNelDominio } from '../../identita/index.ts';
import { registraTipo } from '../anteprime.ts';
import type { Contesto } from '../contesto.ts';
import { puoAmministrare, richiedi } from '../permessi.ts';
import type { RigaModifica } from '../registro.ts';
import { analizza } from '../valida.ts';

export function richiediWebmaster(ctx: Contesto): void {
  richiedi(puoAmministrare(ctx.utente), 'Operazione riservata al webmaster.');
}

const RUOLI = ['accesso_completo', 'buona_strada', 'webmaster', 'beta_tester', 'escluso'] as const;
type Ruolo = (typeof RUOLI)[number];

export interface VoceUtente {
  email: string;
  associato: string | null;
  unita: string[];
  ruoli: Ruolo[];
}

interface RigaUtente {
  email: string;
  associato_id: number | null;
  associato: string | null;
  accesso_completo: number;
  buona_strada: number;
  webmaster: number;
  beta_tester: number;
  escluso: number;
  unita: string | null;
}

const SELECT_UTENTI = `
  SELECT u.email, u.associato_id, u.accesso_completo, u.buona_strada, u.webmaster,
         u.beta_tester, u.escluso,
         (SELECT a.cognome || ' ' || a.nome FROM associati a WHERE a.id = u.associato_id) AS associato,
         (SELECT group_concat(uu.unita_id) FROM utenti_unita uu WHERE uu.email = u.email) AS unita
    FROM utenti u`;

const unitaDi = (r: RigaUtente): string[] => (r.unita ? r.unita.split(',').sort() : []);

export async function elencaUtenti(ctx: Contesto): Promise<VoceUtente[]> {
  richiediWebmaster(ctx);
  const { results } = await ctx.db.prepare(`${SELECT_UTENTI} ORDER BY u.email`).all<RigaUtente>();
  return results.map((r) => ({
    email: r.email,
    associato: r.associato,
    unita: unitaDi(r),
    ruoli: RUOLI.filter((ruolo) => r[ruolo] === 1),
  }));
}

const schemaImpostaUtente = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
  unita: z.array(z.string().min(1)).optional(),
  accesso_completo: z.boolean().optional(),
  buona_strada: z.boolean().optional(),
  webmaster: z.boolean().optional(),
  beta_tester: z.boolean().optional(),
  escluso: z.boolean().optional(),
  associato_id: z.number().int().positive().nullable().optional(),
});
export type ImpostaUtente = z.infer<typeof schemaImpostaUtente>;

/** Crea un utente o ne cambia unità, ruoli o scheda collegata. */
export const impostaUtente = registraTipo<ImpostaUtente>({
  tipo: 'utente.imposta',
  valida: (p) => analizza(schemaImpostaUtente, p),
  async pianifica(ctx, p) {
    richiediWebmaster(ctx);
    if (!emailNelDominio(p.email, ctx.dominio)) {
      throw new ErrorePpu(
        'richiesta_non_valida',
        "L'email deve appartenere al dominio del gruppo.",
      );
    }
    const attuale = await ctx.db
      .prepare(`${SELECT_UTENTI} WHERE u.email = ?`)
      .bind(p.email)
      .first<RigaUtente>();

    const primaRuoli = Object.fromEntries(
      RUOLI.map((r) => [r, attuale ? attuale[r] === 1 : false]),
    ) as Record<Ruolo, boolean>;
    const dopoRuoli = Object.fromEntries(RUOLI.map((r) => [r, p[r] ?? primaRuoli[r]])) as Record<
      Ruolo,
      boolean
    >;
    const primaUnita = attuale ? unitaDi(attuale) : [];
    const dopoUnita = p.unita ? [...new Set(p.unita)].sort() : primaUnita;
    const primaAssociato = attuale?.associato_id ?? null;
    const dopoAssociato = p.associato_id === undefined ? primaAssociato : p.associato_id;

    if (p.unita) {
      for (const u of dopoUnita) {
        const esiste = await ctx.db
          .prepare('SELECT 1 FROM unita WHERE id = ? AND attiva = 1')
          .bind(u)
          .first();
        if (!esiste)
          throw new ErrorePpu('richiesta_non_valida', `Unità inesistente o non attiva: ${u}.`);
      }
    }
    if (dopoAssociato !== null && dopoAssociato !== primaAssociato) {
      const esiste = await ctx.db
        .prepare("SELECT 1 FROM associati WHERE id = ? AND stato = 'attivo'")
        .bind(dopoAssociato)
        .first();
      if (!esiste) throw new ErrorePpu('richiesta_non_valida', 'Scheda associato inesistente.');
    }

    // Deve restare almeno un webmaster attivo.
    const eraWebmaster = primaRuoli.webmaster && !primaRuoli.escluso;
    const saraWebmaster = dopoRuoli.webmaster && !dopoRuoli.escluso;
    if (eraWebmaster && !saraWebmaster) {
      const altri = await ctx.db
        .prepare(
          'SELECT count(*) AS n FROM utenti WHERE webmaster = 1 AND escluso = 0 AND email <> ?',
        )
        .bind(p.email)
        .first<number>('n');
      if (!altri) throw new ErrorePpu('conflitto', 'Deve restare almeno un webmaster.');
    }

    const righe: RigaModifica[] = [];
    const riga = (campo: string, prima: unknown, dopo: unknown) =>
      righe.push({ entita: 'utenti', entitaId: p.email, campo, prima, dopo, buonaStrada: false });

    if (!attuale) {
      righe.push({
        entita: 'utenti',
        entitaId: p.email,
        campo: null,
        prima: null,
        dopo: { ...dopoRuoli, unita: dopoUnita, associato_id: dopoAssociato },
        buonaStrada: false,
      });
    } else {
      for (const r of RUOLI)
        if (primaRuoli[r] !== dopoRuoli[r]) riga(r, primaRuoli[r], dopoRuoli[r]);
      if (JSON.stringify(primaUnita) !== JSON.stringify(dopoUnita))
        riga('unita', primaUnita, dopoUnita);
      if (primaAssociato !== dopoAssociato) riga('associato_id', primaAssociato, dopoAssociato);
    }

    const b = (v: boolean) => (v ? 1 : 0);
    const istruzioni: D1PreparedStatement[] = [
      ctx.db
        .prepare(
          `INSERT INTO utenti (email, associato_id, accesso_completo, buona_strada, webmaster, beta_tester, escluso)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (email) DO UPDATE SET
             associato_id = excluded.associato_id,
             accesso_completo = excluded.accesso_completo,
             buona_strada = excluded.buona_strada,
             webmaster = excluded.webmaster,
             beta_tester = excluded.beta_tester,
             escluso = excluded.escluso,
             aggiornato_il = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        )
        .bind(
          p.email,
          dopoAssociato,
          b(dopoRuoli.accesso_completo),
          b(dopoRuoli.buona_strada),
          b(dopoRuoli.webmaster),
          b(dopoRuoli.beta_tester),
          b(dopoRuoli.escluso),
        ),
    ];
    if (JSON.stringify(primaUnita) !== JSON.stringify(dopoUnita)) {
      // Associazione utente-unità: si riscrive per intero; prima e dopo restano nel registro.
      istruzioni.push(ctx.db.prepare('DELETE FROM utenti_unita WHERE email = ?').bind(p.email));
      for (const u of dopoUnita) {
        istruzioni.push(
          ctx.db
            .prepare('INSERT INTO utenti_unita (email, unita_id) VALUES (?, ?)')
            .bind(p.email, u),
        );
      }
    }

    return {
      descrizione: attuale ? `Aggiorna l'utente ${p.email}.` : `Crea l'utente ${p.email}.`,
      righe,
      istruzioni,
      conteggio: 1,
    };
  },
});
