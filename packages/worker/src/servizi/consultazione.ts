// Consultazione: elenco e scheda degli associati, unità.
//
// Ogni capo del dominio legge tutto, ma le risposte sono minime: nessun codice
// fiscale e nessun campo sensibile (vedi src/dominio/campi.ts). Le query
// selezionano colonne esplicite: un campo sensibile non può "scappare" con un
// SELECT *.

import { ErrorePpu } from '../errori.ts';
import type { Utente } from '../identita/index.ts';
import { puoLeggere, puoModificareAssociato, richiedi } from './permessi.ts';

export interface UnitaConConteggio {
  id: string;
  nome: string;
  branca: string;
  associati: number;
}

export async function elencaUnita(db: D1Database, utente: Utente): Promise<UnitaConConteggio[]> {
  richiedi(puoLeggere(utente), 'Lettura non consentita.');
  const { results } = await db
    .prepare(
      `SELECT u.id, u.nome, u.branca_id AS branca,
              (SELECT count(*) FROM associati a WHERE a.unita_id = u.id AND a.stato = 'attivo') AS associati
         FROM unita u
        WHERE u.attiva = 1
        ORDER BY u.ordine, u.nome`,
    )
    .all<UnitaConConteggio>();
  return results;
}

export type FiltroStato = 'attivo' | 'archiviato' | 'tutti';

export interface FiltriElenco {
  q?: string | undefined;
  unita?: string | undefined;
  stato?: string | undefined;
}

export interface VoceElenco {
  id: number;
  cognome: string;
  nome: string;
  unita: { id: string; nome: string } | null;
  annoNascita: number | null;
  eta: number | null;
  stato: 'attivo' | 'archiviato';
  tag: string[];
}

/** Età compiuta alla data `oggi` (AAAA-MM-GG). */
export function etaAl(dataNascita: string | null, oggi: string): number | null {
  if (!dataNascita || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascita)) return null;
  const anni = Number(oggi.slice(0, 4)) - Number(dataNascita.slice(0, 4));
  return oggi.slice(5) < dataNascita.slice(5) ? anni - 1 : anni;
}

const oggiIso = (): string => new Date().toISOString().slice(0, 10);

// Tag attivi dell'anno scout attuale (o senza anno), come elenco di nomi.
const TAG_ATTUALI = `
  SELECT group_concat(t.nome, '|') FROM associati_tag at
    JOIN tag t ON t.id = at.tag_id
   WHERE at.associato_id = a.id AND at.rimosso_il IS NULL AND t.stato <> 'archiviato'
     AND (at.anno_scout_id IS NULL
          OR at.anno_scout_id = (SELECT id FROM anni_scout WHERE attuale = 1))`;

const MAX_RISULTATI = 500;

export async function cercaAssociati(
  db: D1Database,
  utente: Utente,
  filtri: FiltriElenco,
): Promise<VoceElenco[]> {
  richiedi(puoLeggere(utente), 'Lettura non consentita.');
  const stato = (filtri.stato ?? 'attivo') as FiltroStato;
  if (!['attivo', 'archiviato', 'tutti'].includes(stato)) {
    throw new ErrorePpu('richiesta_non_valida', 'Filtro di stato non valido.');
  }
  const condizioni: string[] = [];
  const valori: (string | number)[] = [];
  if (stato !== 'tutti') {
    condizioni.push('a.stato = ?');
    valori.push(stato);
  }
  if (filtri.unita) {
    condizioni.push('a.unita_id = ?');
    valori.push(filtri.unita);
  }
  const q = filtri.q?.trim().replace(/\s+/g, ' ');
  if (q) {
    // Cerca "cognome nome" e "nome cognome", senza distinzione di maiuscole.
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    condizioni.push(
      `((a.cognome || ' ' || a.nome) LIKE ? ESCAPE '\\' OR (a.nome || ' ' || a.cognome) LIKE ? ESCAPE '\\')`,
    );
    valori.push(like, like);
  }
  const where = condizioni.length > 0 ? `WHERE ${condizioni.join(' AND ')}` : '';
  const { results } = await db
    .prepare(
      `SELECT a.id, a.cognome, a.nome, a.data_nascita, a.stato,
              u.id AS unita_id, u.nome AS unita_nome,
              (${TAG_ATTUALI}) AS tag
         FROM associati a LEFT JOIN unita u ON u.id = a.unita_id
         ${where}
        ORDER BY a.cognome COLLATE NOCASE, a.nome COLLATE NOCASE
        LIMIT ${MAX_RISULTATI}`,
    )
    .bind(...valori)
    .all<{
      id: number;
      cognome: string;
      nome: string;
      data_nascita: string | null;
      stato: 'attivo' | 'archiviato';
      unita_id: string | null;
      unita_nome: string | null;
      tag: string | null;
    }>();
  const oggi = oggiIso();
  return results.map((r) => ({
    id: r.id,
    cognome: r.cognome,
    nome: r.nome,
    unita: r.unita_id ? { id: r.unita_id, nome: r.unita_nome ?? r.unita_id } : null,
    annoNascita: r.data_nascita ? Number(r.data_nascita.slice(0, 4)) : null,
    eta: etaAl(r.data_nascita, oggi),
    stato: r.stato,
    tag: r.tag ? r.tag.split('|').sort() : [],
  }));
}

export interface SchedaAssociato {
  id: number;
  codiceCensimento: string | null;
  cognome: string;
  nome: string;
  dataNascita: string | null;
  luogoNascita: string | null;
  eta: number | null;
  unita: { id: string; nome: string } | null;
  stato: 'attivo' | 'archiviato';
  eCapo: boolean;
  residenza: {
    indirizzo: string | null;
    cap: string | null;
    comune: string | null;
    provincia: string | null;
  };
  contatti: { cellulare: string | null; telefonoCasa: string | null; email: string | null };
  privacy: {
    informativa: boolean;
    informativaData: string | null;
    consenso2a: boolean;
    consenso2b: boolean;
    consenso2c: boolean;
    note: string | null;
  };
  tutori: {
    id: number;
    relazione: string;
    cognome: string;
    nome: string;
    cellulare: string | null;
    email: string | null;
    riceveComunicazioni: boolean;
    associatoCollegatoId: number | null;
  }[];
  relazioni: { tipo: string; associatoId: number; cognome: string; nome: string }[];
  tag: { nome: string; tipo: string }[];
  progressione: { data: string | null; tipo: string | null; descrizione: string | null }[];
  presenze: {
    conteggi: { presente: number; assente: number; giustificato: number };
    ultime: {
      data: string;
      tipo: string;
      unita: string;
      stato: string;
      motivazione: string | null;
    }[];
  };
  storicoUnita: { anno: string; unita: string }[];
  /** Solo un'indicazione per l'interfaccia: il controllo vero è nei servizi di modifica. */
  puoModificare: boolean;
}

export async function schedaAssociato(
  db: D1Database,
  utente: Utente,
  id: number,
): Promise<SchedaAssociato> {
  richiedi(puoLeggere(utente), 'Lettura non consentita.');
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorePpu('richiesta_non_valida', 'Identificativo non valido.');
  }
  const a = await db
    .prepare(
      `SELECT a.id, a.codice_censimento, a.cognome, a.nome, a.data_nascita, a.luogo_nascita,
              a.unita_id, u.nome AS unita_nome, a.stato,
              a.indirizzo, a.cap, a.comune, a.provincia, a.cellulare, a.telefono_casa, a.email,
              a.informativa, a.informativa_data, a.consenso_2a, a.consenso_2b, a.consenso_2c,
              a.note_privacy,
              EXISTS (SELECT 1 FROM utenti ut WHERE ut.associato_id = a.id) AS e_capo
         FROM associati a LEFT JOIN unita u ON u.id = a.unita_id
        WHERE a.id = ?`,
    )
    .bind(id)
    .first<Record<string, string | number | null>>();
  if (!a) throw new ErrorePpu('non_trovato', 'Associato non trovato.');

  const [tutori, relazioni, tag, progressione, conteggi, ultime, storico] = await db.batch([
    db
      .prepare(
        `SELECT id, relazione, cognome, nome, cellulare, email, riceve_comunicazioni,
                associato_collegato_id
           FROM tutori WHERE associato_id = ? AND archiviato = 0 ORDER BY id`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT r.tipo, r.altro_associato_id AS associato_id, x.cognome, x.nome
           FROM relazioni r JOIN associati x ON x.id = r.altro_associato_id
          WHERE r.associato_id = ? AND r.archiviata = 0
          ORDER BY r.tipo, x.cognome, x.nome`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT t.nome, t.tipo_id AS tipo FROM associati_tag at JOIN tag t ON t.id = at.tag_id
          WHERE at.associato_id = ? AND at.rimosso_il IS NULL AND t.stato <> 'archiviato'
            AND (at.anno_scout_id IS NULL
                 OR at.anno_scout_id = (SELECT id FROM anni_scout WHERE attuale = 1))
          ORDER BY t.tipo_id, t.nome`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT p.data, coalesce(c.tipo, p.tipo) AS tipo, coalesce(c.nome, p.descrizione) AS descrizione
           FROM progressione p LEFT JOIN catalogo_progressione c ON c.id = p.catalogo_id
          WHERE p.associato_id = ? AND p.archiviata = 0
          ORDER BY p.data DESC, p.id DESC`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT pr.stato, count(*) AS n FROM presenze pr JOIN riunioni r ON r.id = pr.riunione_id
          WHERE pr.associato_id = ? AND r.archiviata = 0
            AND r.anno_scout_id = (SELECT id FROM anni_scout WHERE attuale = 1)
          GROUP BY pr.stato`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT r.data, r.tipo, u.nome AS unita, pr.stato, pr.motivazione
           FROM presenze pr JOIN riunioni r ON r.id = pr.riunione_id JOIN unita u ON u.id = r.unita_id
          WHERE pr.associato_id = ? AND r.archiviata = 0
          ORDER BY r.data DESC LIMIT 10`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT an.nome AS anno, u.nome AS unita FROM storico_unita s
           JOIN anni_scout an ON an.id = s.anno_scout_id JOIN unita u ON u.id = s.unita_id
          WHERE s.associato_id = ? ORDER BY an.data_inizio DESC, u.ordine`,
      )
      .bind(id),
  ]);

  type Riga = Record<string, string | number | null>;
  const righe = (r: D1Result | undefined): Riga[] => (r?.results ?? []) as Riga[];
  const testo = (v: string | number | null | undefined): string | null =>
    v === null || v === undefined ? null : String(v);
  const conta = { presente: 0, assente: 0, giustificato: 0 };
  for (const r of righe(conteggi)) {
    const s = String(r.stato) as keyof typeof conta;
    if (s in conta) conta[s] = Number(r.n);
  }
  const eCapo = a.e_capo === 1;
  const unitaId = testo(a.unita_id);

  return {
    id: Number(a.id),
    codiceCensimento: testo(a.codice_censimento),
    cognome: String(a.cognome),
    nome: String(a.nome),
    dataNascita: testo(a.data_nascita),
    luogoNascita: testo(a.luogo_nascita),
    eta: etaAl(testo(a.data_nascita), oggiIso()),
    unita: unitaId ? { id: unitaId, nome: testo(a.unita_nome) ?? unitaId } : null,
    stato: a.stato === 'archiviato' ? 'archiviato' : 'attivo',
    eCapo,
    residenza: {
      indirizzo: testo(a.indirizzo),
      cap: testo(a.cap),
      comune: testo(a.comune),
      provincia: testo(a.provincia),
    },
    contatti: {
      cellulare: testo(a.cellulare),
      telefonoCasa: testo(a.telefono_casa),
      email: testo(a.email),
    },
    privacy: {
      informativa: a.informativa === 1,
      informativaData: testo(a.informativa_data),
      consenso2a: a.consenso_2a === 1,
      consenso2b: a.consenso_2b === 1,
      consenso2c: a.consenso_2c === 1,
      note: testo(a.note_privacy),
    },
    tutori: righe(tutori).map((t) => ({
      id: Number(t.id),
      relazione: String(t.relazione),
      cognome: String(t.cognome),
      nome: String(t.nome),
      cellulare: testo(t.cellulare),
      email: testo(t.email),
      riceveComunicazioni: t.riceve_comunicazioni === 1,
      associatoCollegatoId:
        t.associato_collegato_id === null ? null : Number(t.associato_collegato_id),
    })),
    relazioni: righe(relazioni).map((r) => ({
      tipo: String(r.tipo),
      associatoId: Number(r.associato_id),
      cognome: String(r.cognome),
      nome: String(r.nome),
    })),
    tag: righe(tag).map((t) => ({ nome: String(t.nome), tipo: String(t.tipo) })),
    progressione: righe(progressione).map((p) => ({
      data: testo(p.data),
      tipo: testo(p.tipo),
      descrizione: testo(p.descrizione),
    })),
    presenze: {
      conteggi: conta,
      ultime: righe(ultime).map((p) => ({
        data: String(p.data),
        tipo: String(p.tipo),
        unita: String(p.unita),
        stato: String(p.stato),
        motivazione: testo(p.motivazione),
      })),
    },
    storicoUnita: righe(storico).map((s) => ({ anno: String(s.anno), unita: String(s.unita) })),
    puoModificare: puoModificareAssociato(utente, { id: Number(a.id), unitaId, eCapo }),
  };
}

export interface UtenteDemo {
  email: string;
  etichetta: string;
  descrizione: string;
}

/**
 * Utenti da scegliere nella schermata "Scegli un ruolo" della modalità di test.
 * Il chiamante deve verificare che la modalità di test sia attiva.
 */
export async function utentiDemo(db: D1Database, dominio: string): Promise<UtenteDemo[]> {
  const { results } = await db
    .prepare(
      `SELECT u.email, u.accesso_completo, u.buona_strada, u.webmaster, u.escluso,
              (SELECT group_concat(un.nome, ', ') FROM utenti_unita uu JOIN unita un ON un.id = uu.unita_id
                WHERE uu.email = u.email) AS unita,
              a.nome || ' ' || a.cognome AS persona
         FROM utenti u LEFT JOIN associati a ON a.id = u.associato_id
        ORDER BY u.escluso, u.webmaster, u.accesso_completo DESC, u.email`,
    )
    .all<{
      email: string;
      accesso_completo: number;
      buona_strada: number;
      webmaster: number;
      escluso: number;
      unita: string | null;
      persona: string | null;
    }>();
  const elenco = results.map((u) => {
    const ruoli: string[] = [];
    if (u.accesso_completo) ruoli.push('accesso completo');
    if (u.unita) ruoli.push(`modifica: ${u.unita}`);
    if (u.buona_strada) ruoli.push('referente Buona Strada');
    if (u.webmaster) ruoli.push('webmaster');
    if (u.escluso) ruoli.push('account escluso');
    return {
      email: u.email,
      etichetta: u.persona ?? u.email.split('@')[0] ?? u.email,
      descrizione: ruoli.join(' · ') || 'sola lettura',
    };
  });
  // Un account del dominio senza riga in `utenti`: capo in sola lettura.
  elenco.push({
    email: `capo.sola.lettura@${dominio}`,
    etichetta: 'Capo in sola lettura',
    descrizione: 'account del dominio senza ruoli',
  });
  return elenco;
}
