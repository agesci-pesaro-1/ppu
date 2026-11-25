import { eq, sql } from 'drizzle-orm';
import type { Config } from '../config.ts';
import type { Db } from '../db/index.ts';
import { users, userUnits } from '../db/schema.ts';
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
export async function loadUser(db: Db, email: string, config: Config): Promise<User> {
  const row = await db
    .select({
      memberId: users.memberId,
      fullAccess: users.fullAccess,
      buonaStrada: users.buonaStrada,
      webmaster: users.webmaster,
      betaTester: users.betaTester,
      excluded: users.excluded,
      units: sql<string | null>`group_concat(${userUnits.unitId})`,
    })
    .from(users)
    .leftJoin(userUnits, eq(userUnits.email, users.email))
    .where(eq(users.email, email))
    .groupBy(users.email)
    .get();

  const user: User = {
    email,
    memberId: row?.memberId ?? null,
    units: row?.units ? row.units.split(',').sort() : [],
    fullAccess: row?.fullAccess ?? false,
    buonaStrada: row?.buonaStrada ?? false,
    webmaster: row?.webmaster ?? false,
    betaTester: row?.betaTester ?? false,
  };

  if (row?.excluded) {
    throw new AppError('excluded', 'Questo account non ha accesso a PPU.');
  }
  if (config.environment === 'beta' && !user.betaTester) {
    throw new AppError('not_beta_tester', 'La versione beta è riservata ai tester.');
  }
  return user;
}
