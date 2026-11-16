// Permission rules. This is the only place that decides who can do what:
// REST and MCP call the services, the services call these functions.

import { AppError } from '../errors.ts';
import type { User } from '../identity/index.ts';

/** A member as seen by the permission rules. */
export interface MemberForPermissions {
  id: number;
  unitId: string | null;
  /** true if the member is a leader (has a row in `utenti`). */
  isLeader: boolean;
}

/** Every enabled leader (row in `utenti`, not excluded) reads everything. */
export function canRead(_user: User): boolean {
  return true;
}

export function canEditUnit(user: User, unitId: string): boolean {
  return user.fullAccess || user.units.includes(unitId);
}

/**
 * A leader's data is edited by the leader or by someone with full access.
 * Other members are edited by whoever can edit their current unit.
 */
export function canEditMember(user: User, member: MemberForPermissions): boolean {
  if (user.fullAccess) return true;
  if (member.isLeader) return user.memberId === member.id;
  return member.unitId !== null && canEditUnit(user, member.unitId);
}

/** The Buona Strada confirmer needs the role and must not be the author. Applies to everyone. */
export function canConfirmBuonaStrada(user: User, authorEmail: string): boolean {
  return user.buonaStrada && user.email !== authorEmail.toLowerCase();
}

export function canAdminister(user: User): boolean {
  return user.webmaster;
}

/** Throws `forbidden` if the condition is false. The message is shown to the user. */
export function ensure(condition: boolean, message: string): void {
  if (!condition) throw new AppError('forbidden', message);
}
