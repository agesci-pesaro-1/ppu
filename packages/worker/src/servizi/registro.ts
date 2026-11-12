// Registro delle modifiche e delle letture sensibili.
//
// `istruzioniModifiche` restituisce istruzioni preparate, così chi modifica i
// dati le esegue nello stesso db.batch() della modifica: dato e registro si
// salvano insieme o per niente.

export type Canale = 'mcp' | 'pwa' | 'admin' | 'import' | 'sistema';

export interface RigaModifica {
  entita: string;
  entitaId: string | number;
  /** null per creazione o archiviazione dell'intera riga. */
  campo: string | null;
  prima: unknown;
  dopo: unknown;
  /** true se il campo va riportato su Buona Strada. */
  buonaStrada: boolean;
}

export interface Operazione {
  id: string;
  autoreEmail: string;
  canale: Canale;
}

export function nuovaOperazione(autoreEmail: string, canale: Canale): Operazione {
  return { id: crypto.randomUUID(), autoreEmail, canale };
}

const json = (v: unknown): string | null => (v === undefined ? null : JSON.stringify(v));

export function istruzioniModifiche(
  db: D1Database,
  operazione: Operazione,
  righe: readonly RigaModifica[],
): D1PreparedStatement[] {
  const stmt = db.prepare(
    `INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
                            valore_prima, valore_dopo, stato_buona_strada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  return righe.map((r) =>
    stmt.bind(
      operazione.id,
      operazione.autoreEmail,
      operazione.canale,
      r.entita,
      String(r.entitaId),
      r.campo,
      json(r.prima),
      json(r.dopo),
      r.buonaStrada ? 'da_riportare' : null,
    ),
  );
}

export interface LetturaSensibile {
  email: string;
  canale: Exclude<Canale, 'import'>;
  entita: string;
  entitaId?: string | number;
  campi: readonly string[];
  motivo?: string;
}

export function istruzioneAccesso(db: D1Database, l: LetturaSensibile): D1PreparedStatement {
  return db
    .prepare(
      'INSERT INTO accessi (email, canale, entita, entita_id, campi, motivo) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      l.email,
      l.canale,
      l.entita,
      l.entitaId === undefined ? null : String(l.entitaId),
      JSON.stringify(l.campi),
      l.motivo ?? null,
    );
}

export async function registraAccesso(db: D1Database, l: LetturaSensibile): Promise<void> {
  await istruzioneAccesso(db, l).run();
}
