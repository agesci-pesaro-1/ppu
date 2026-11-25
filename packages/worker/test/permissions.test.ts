import { describe, expect, it } from 'vitest';
import type { User } from '../src/identity/index.ts';
import {
  canAdminister,
  canConfirmBuonaStrada,
  canEditMember,
  canEditUnit,
} from '../src/services/permissions.ts';

const user = (u: Partial<User>): User => ({
  email: 'capo@example.org',
  memberId: null,
  units: [],
  fullAccess: false,
  buonaStrada: false,
  webmaster: false,
  betaTester: false,
  ...u,
});

describe('permissions', () => {
  it('a Lupetti leader edits Lupetti but not Coccinelle', () => {
    const u = user({ units: ['lupetti'] });
    expect(canEditUnit(u, 'lupetti')).toBe(true);
    expect(canEditUnit(u, 'coccinelle')).toBe(false);
  });

  it('a read-only leader edits nothing', () => {
    const u = user({});
    expect(canEditUnit(u, 'lupetti')).toBe(false);
    expect(canEditMember(u, { id: 1, unitId: 'lupetti', isLeader: false })).toBe(false);
  });

  it('full access edits every unit and every leader', () => {
    const u = user({ fullAccess: true });
    expect(canEditUnit(u, 'clan')).toBe(true);
    expect(canEditMember(u, { id: 9, unitId: 'coca', isLeader: true })).toBe(true);
  });

  it("a leader's data is edited only by that leader (or full access)", () => {
    const colleague = user({ units: ['coca'], memberId: 1 });
    expect(canEditMember(colleague, { id: 2, unitId: 'coca', isLeader: true })).toBe(false);
    expect(canEditMember(colleague, { id: 1, unitId: 'coca', isLeader: true })).toBe(true);
  });

  it('a member without a unit is edited only with full access', () => {
    expect(
      canEditMember(user({ units: ['lupetti'] }), {
        id: 3,
        unitId: null,
        isLeader: false,
      }),
    ).toBe(false);
  });

  it('the Buona Strada confirmer cannot be the author, not even with full access', () => {
    const u = user({ email: 'bs@example.org', buonaStrada: true, fullAccess: true });
    expect(canConfirmBuonaStrada(u, 'bs@example.org')).toBe(false);
    expect(canConfirmBuonaStrada(u, 'BS@example.org')).toBe(false);
    expect(canConfirmBuonaStrada(u, 'other@example.org')).toBe(true);
    expect(canConfirmBuonaStrada(user({}), 'other@example.org')).toBe(false);
  });

  it('only the webmaster administers', () => {
    expect(canAdminister(user({ webmaster: true }))).toBe(true);
    expect(canAdminister(user({ fullAccess: true }))).toBe(false);
  });
});
