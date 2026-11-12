import type { Config } from '../config.ts';
import { ErrorePpu } from '../errori.ts';
import { emailDaAccess } from './access.ts';

/** Header usato dalla modalità di test (solo locale e preview). */
export const HEADER_UTENTE_TEST = 'X-Ppu-Utente-Test';

export interface Utente {
  email: string;
  /** Scheda associato del capo, per "i propri dati". */
  associatoId: number | null;
  /** Unità in cui il capo può modificare. */
  unita: string[];
  accessoCompleto: boolean;
  buonaStrada: boolean;
  webmaster: boolean;
  betaTester: boolean;
}

interface RigaUtente {
  email: string;
  associato_id: number | null;
  accesso_completo: number;
  buona_strada: number;
  webmaster: number;
  beta_tester: number;
  escluso: number;
  unita: string | null;
}

export function emailNelDominio(email: string, dominio: string): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  return at > 0 && e.slice(at + 1) === dominio;
}

/** Ricava l'email dalla richiesta: JWT di Access, oppure header di test. */
export async function emailDallaRichiesta(request: Request, config: Config): Promise<string> {
  let email: string | null = null;
  if (config.modalitaTest) {
    email = request.headers.get(HEADER_UTENTE_TEST);
  }
  if (!email && config.access) {
    email = await emailDaAccess(request, config.access);
  }
  if (!email) throw new ErrorePpu('non_autenticato', 'Accesso richiesto.');
  if (!emailNelDominio(email, config.dominio)) {
    throw new ErrorePpu('dominio_non_ammesso', 'Account non appartenente al dominio del gruppo.');
  }
  return email.trim().toLowerCase();
}

/**
 * Carica unità e ruoli dalla tabella utenti. Un account del dominio senza riga
 * è un capo in sola lettura. Gli account esclusi non entrano; in beta entrano
 * solo i beta tester.
 */
export async function caricaUtente(db: D1Database, email: string, config: Config): Promise<Utente> {
  const riga = await db
    .prepare(
      `SELECT u.email, u.associato_id, u.accesso_completo, u.buona_strada, u.webmaster,
              u.beta_tester, u.escluso, group_concat(uu.unita_id) AS unita
         FROM utenti u LEFT JOIN utenti_unita uu ON uu.email = u.email
        WHERE u.email = ?
        GROUP BY u.email`,
    )
    .bind(email)
    .first<RigaUtente>();

  const utente: Utente = riga
    ? {
        email,
        associatoId: riga.associato_id,
        unita: riga.unita ? riga.unita.split(',').sort() : [],
        accessoCompleto: riga.accesso_completo === 1,
        buonaStrada: riga.buona_strada === 1,
        webmaster: riga.webmaster === 1,
        betaTester: riga.beta_tester === 1,
      }
    : {
        email,
        associatoId: null,
        unita: [],
        accessoCompleto: false,
        buonaStrada: false,
        webmaster: false,
        betaTester: false,
      };

  if (riga?.escluso === 1) {
    throw new ErrorePpu('escluso', 'Questo account non ha accesso a PPU.');
  }
  if (config.ambiente === 'beta' && !utente.betaTester) {
    throw new ErrorePpu('non_beta_tester', 'La versione beta è riservata ai tester.');
  }
  return utente;
}
