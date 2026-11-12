// Anteprima prima/dopo → conferma esplicita, per ogni modifica.
//
// Ogni tipo di operazione dichiara come validare la richiesta e come
// pianificarla (permessi, righe prima/dopo, istruzioni). `proponi` salva la
// richiesta e restituisce l'anteprima; `conferma` ricontrolla i permessi,
// ripianifica sullo stato attuale (se i dati sono cambiati l'anteprima non vale
// più) e applica dato + registro + chiusura dell'anteprima in un solo db.batch().

import { ErrorePpu } from '../errori.ts';
import { adesso, type Contesto } from './contesto.ts';
import { istruzioniModifiche, type RigaModifica } from './registro.ts';

/** Durata di validità di un'anteprima. */
export const DURATA_ANTEPRIMA_MS = 15 * 60 * 1000;

export interface Piano {
  /** Frase breve in italiano: cosa succede confermando. */
  descrizione: string;
  /** Righe prima/dopo, che finiscono anche nel registro `modifiche`. */
  righe: RigaModifica[];
  /** Istruzioni che applicano la modifica (senza registro). */
  istruzioni: D1PreparedStatement[];
  /** Quante entità tocca l'operazione (> 1 = operazione di massa). */
  conteggio: number;
}

export interface TipoOperazione<P> {
  tipo: string;
  /** Valida il payload; lancia richiesta_non_valida. */
  valida(payload: unknown): P;
  /** Controlla i permessi e calcola il piano sullo stato attuale dei dati. */
  pianifica(ctx: Contesto, payload: P): Promise<Piano>;
}

export interface VoceAnteprima {
  entita: string;
  entitaId: string;
  campo: string | null;
  prima: unknown;
  dopo: unknown;
}

export interface Anteprima {
  id: string;
  tipo: string;
  descrizione: string;
  modifiche: VoceAnteprima[];
  conteggio: number;
  /** true se tocca più di un'entità: la conferma deve ripetere il conteggio. */
  massiva: boolean;
  scadeIl: string;
}

const tipi = new Map<string, TipoOperazione<unknown>>();

export function registraTipo<P>(t: TipoOperazione<P>): TipoOperazione<P> {
  tipi.set(t.tipo, t as TipoOperazione<unknown>);
  return t;
}

function tipoDa(nome: string): TipoOperazione<unknown> {
  const t = tipi.get(nome);
  if (!t) throw new ErrorePpu('richiesta_non_valida', `Tipo di operazione sconosciuto: ${nome}.`);
  return t;
}

const vistaRighe = (righe: RigaModifica[]): VoceAnteprima[] =>
  righe.map((r) => ({
    entita: r.entita,
    entitaId: String(r.entitaId),
    campo: r.campo,
    prima: r.prima ?? null,
    dopo: r.dopo ?? null,
  }));

export async function proponi(ctx: Contesto, tipo: string, payload: unknown): Promise<Anteprima> {
  const t = tipoDa(tipo);
  const valido = t.valida(payload);
  const piano = await t.pianifica(ctx, valido);
  if (piano.righe.length === 0) {
    throw new ErrorePpu(
      'richiesta_non_valida',
      'Nessuna modifica da fare: i valori sono già questi.',
    );
  }
  const id = crypto.randomUUID();
  const scadeIl = new Date(adesso(ctx).getTime() + DURATA_ANTEPRIMA_MS).toISOString();
  const modifiche = vistaRighe(piano.righe);
  await ctx.db
    .prepare(
      `INSERT INTO anteprime (id, autore_email, canale, tipo, payload, anteprima, conteggio, scade_il)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      ctx.utente.email,
      ctx.canale,
      tipo,
      JSON.stringify(valido),
      JSON.stringify(modifiche),
      piano.conteggio,
      scadeIl,
    )
    .run();
  return {
    id,
    tipo,
    descrizione: piano.descrizione,
    modifiche,
    conteggio: piano.conteggio,
    massiva: piano.conteggio > 1,
    scadeIl,
  };
}

interface RigaAnteprima {
  id: string;
  autore_email: string;
  tipo: string;
  payload: string;
  anteprima: string;
  conteggio: number;
  stato: string;
  scade_il: string;
}

async function carica(ctx: Contesto, id: string): Promise<RigaAnteprima> {
  const riga = await ctx.db
    .prepare('SELECT * FROM anteprime WHERE id = ?')
    .bind(id)
    .first<RigaAnteprima>();
  // L'anteprima di un altro autore non si conferma e non si rivela.
  if (!riga || riga.autore_email !== ctx.utente.email) {
    throw new ErrorePpu('non_trovato', 'Operazione non trovata.');
  }
  return riga;
}

async function chiudi(ctx: Contesto, id: string, stato: 'annullata' | 'scaduta'): Promise<void> {
  await ctx.db
    .prepare("UPDATE anteprime SET stato = ?, chiuso_il = ? WHERE id = ? AND stato = 'in_attesa'")
    .bind(stato, adesso(ctx).toISOString(), id)
    .run();
}

export interface Esito {
  id: string;
  descrizione: string;
  conteggio: number;
}

export async function conferma(
  ctx: Contesto,
  id: string,
  opzioni: { conteggio?: number | undefined } = {},
): Promise<Esito> {
  const riga = await carica(ctx, id);
  if (riga.stato !== 'in_attesa') {
    throw new ErrorePpu('anteprima_non_valida', `Operazione già ${riga.stato}.`);
  }
  if (riga.scade_il <= adesso(ctx).toISOString()) {
    await chiudi(ctx, id, 'scaduta');
    throw new ErrorePpu('anteprima_non_valida', 'Anteprima scaduta: proponi di nuovo la modifica.');
  }
  if (riga.conteggio > 1 && opzioni.conteggio !== riga.conteggio) {
    throw new ErrorePpu(
      'richiesta_non_valida',
      `Operazione di massa su ${riga.conteggio} elementi: per confermare ripeti il numero.`,
    );
  }

  const t = tipoDa(riga.tipo);
  const payload = t.valida(JSON.parse(riga.payload));
  // Permessi e dati ricontrollati adesso, non al momento dell'anteprima.
  const piano = await t.pianifica(ctx, payload);
  if (JSON.stringify(vistaRighe(piano.righe)) !== riga.anteprima) {
    await chiudi(ctx, id, 'scaduta');
    throw new ErrorePpu(
      'anteprima_non_valida',
      "I dati sono cambiati dopo l'anteprima: proponi di nuovo la modifica.",
    );
  }

  await ctx.db.batch([
    ...piano.istruzioni,
    ...istruzioniModifiche(
      ctx.db,
      { id, autoreEmail: ctx.utente.email, canale: ctx.canale },
      piano.righe,
    ),
    // Il trigger fa fallire tutto il batch se l'anteprima è già stata chiusa.
    ctx.db
      .prepare("UPDATE anteprime SET stato = 'confermata', chiuso_il = ? WHERE id = ?")
      .bind(adesso(ctx).toISOString(), id),
  ]);
  return { id, descrizione: piano.descrizione, conteggio: piano.conteggio };
}

export async function annulla(ctx: Contesto, id: string): Promise<void> {
  const riga = await carica(ctx, id);
  if (riga.stato !== 'in_attesa') {
    throw new ErrorePpu('anteprima_non_valida', `Operazione già ${riga.stato}.`);
  }
  await chiudi(ctx, id, 'annullata');
}
