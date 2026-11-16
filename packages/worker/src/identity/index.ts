import type { Config } from '../config.ts';
import { AppError } from '../errors.ts';
import { emailFromAccess } from './access.ts';

/** Header used by test mode (local and preview only). */
export const TEST_USER_HEADER = 'X-Ppu-Test-User';

export interface User {
  email: string;
  /** The leader's own member record, for "own data". */
  memberId: number | null;
  /** Units where the leader can edit. */
  units: string[];
  fullAccess: boolean;
  buonaStrada: boolean;
  webmaster: boolean;
  betaTester: boolean;
}

interface UserRow {
  email: string;
  associato_id: number | null;
  accesso_completo: number;
  buona_strada: number;
  webmaster: number;
  beta_tester: number;
  escluso: number;
  unita: string | null;
}

export function isInDomain(email: string, domain: string): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  return at > 0 && e.slice(at + 1) === domain;
}

/** Gets the email from the request: Access JWT, or the test header. */
export async function emailFromRequest(request: Request, config: Config): Promise<string> {
  let email: string | null = null;
  if (config.testMode) {
    email = request.headers.get(TEST_USER_HEADER);
  }
  if (!email && config.access) {
    email = await emailFromAccess(request, config.access);
  }
  if (!email) throw new AppError('unauthenticated', 'Accesso richiesto.');
  if (!isInDomain(email, config.domain)) {
    throw new AppError('domain_not_allowed', 'Account non appartenente al dominio del gruppo.');
  }
  return email.trim().toLowerCase();
}

/**
 * Loads units and roles from the `utenti` table. A domain account without a
 * row is a read-only leader. Excluded accounts are rejected; in beta only beta
 * testers get in.
 */
export async function loadUser(db: D1Database, email: string, config: Config): Promise<User> {
  const row = await db
    .prepare(
      `SELECT u.email, u.associato_id, u.accesso_completo, u.buona_strada, u.webmaster,
              u.beta_tester, u.escluso, group_concat(uu.unita_id) AS unita
         FROM utenti u LEFT JOIN utenti_unita uu ON uu.email = u.email
        WHERE u.email = ?
        GROUP BY u.email`,
    )
    .bind(email)
    .first<UserRow>();

  const user: User = row
    ? {
        email,
        memberId: row.associato_id,
        units: row.unita ? row.unita.split(',').sort() : [],
        fullAccess: row.accesso_completo === 1,
        buonaStrada: row.buona_strada === 1,
        webmaster: row.webmaster === 1,
        betaTester: row.beta_tester === 1,
      }
    : {
        email,
        memberId: null,
        units: [],
        fullAccess: false,
        buonaStrada: false,
        webmaster: false,
        betaTester: false,
      };

  if (row?.escluso === 1) {
    throw new AppError('excluded', 'Questo account non ha accesso a PPU.');
  }
  if (config.environment === 'beta' && !user.betaTester) {
    throw new AppError('not_beta_tester', 'La versione beta è riservata ai tester.');
  }
  return user;
}
