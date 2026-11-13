// Client dell'API REST del Worker (stessa origine). Nessun dato personale viene
// salvato nel browser: ogni dato arriva dalla rete a ogni apertura.

export interface Io {
  gruppo: string;
  ambiente: string;
  modalitaTest: boolean;
  email: string;
  unita: string[];
  ruoli: {
    accessoCompleto: boolean;
    buonaStrada: boolean;
    webmaster: boolean;
    betaTester: boolean;
  };
  associatoId: number | null;
}

export interface Unita {
  id: string;
  nome: string;
  branca: string;
  associati: number;
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

export interface Scheda {
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
  puoModificare: boolean;
}

export interface UtenteDemo {
  email: string;
  etichetta: string;
  descrizione: string;
}

export class ErroreApi extends Error {
  constructor(
    readonly stato: number,
    readonly codice: string,
    messaggio: string,
  ) {
    super(messaggio);
  }
}

async function richiesta<T>(percorso: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(percorso, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ErroreApi(0, 'rete', 'Connessione non disponibile.');
  }
  if (!r.ok) {
    let codice = 'errore';
    let messaggio = `Errore ${r.status}`;
    try {
      const corpo = (await r.json()) as { errore?: { codice?: string; messaggio?: string } };
      codice = corpo.errore?.codice ?? codice;
      messaggio = corpo.errore?.messaggio ?? messaggio;
    } catch {
      // risposta non JSON (per esempio la pagina di Access)
    }
    throw new ErroreApi(r.status, codice, messaggio);
  }
  return (await r.json()) as T;
}

export const api = {
  io: () => richiesta<Io>('/api/io'),
  unita: () => richiesta<Unita[]>('/api/unita'),
  associati: (filtri: { q?: string; unita?: string }) => {
    const p = new URLSearchParams();
    if (filtri.q) p.set('q', filtri.q);
    if (filtri.unita) p.set('unita', filtri.unita);
    const qs = p.toString();
    return richiesta<VoceElenco[]>(`/api/associati${qs ? `?${qs}` : ''}`);
  },
  scheda: (id: number) => richiesta<Scheda>(`/api/associati/${id}`),
  utentiDemo: () => richiesta<UtenteDemo[]>('/api/demo/utenti'),
};

// Modalità di test (solo preview e locale): il Worker imposta un cookie HttpOnly
// con l'utente scelto, e lo accetta solo in quella modalità.
async function inviaDemo(percorso: string, corpo: unknown): Promise<void> {
  const r = await fetch(percorso, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new ErroreApi(r.status, 'demo', 'Impossibile cambiare utente.');
}

export const scegliUtenteTest = (email: string) => inviaDemo('/api/demo/accedi', { email });
export const esciUtenteTest = () => inviaDemo('/api/demo/esci', {});
