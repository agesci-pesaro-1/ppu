import { describe, expect, it } from 'vitest';
import type { Utente } from '../src/identita/index.ts';
import {
  puoAmministrare,
  puoConfermareBuonaStrada,
  puoModificareAssociato,
  puoModificareUnita,
} from '../src/servizi/permessi.ts';

const utente = (u: Partial<Utente>): Utente => ({
  email: 'capo@example.org',
  associatoId: null,
  unita: [],
  accessoCompleto: false,
  buonaStrada: false,
  webmaster: false,
  betaTester: false,
  ...u,
});

describe('permessi', () => {
  it('un capo dei Lupetti modifica i Lupetti ma non le Coccinelle', () => {
    const u = utente({ unita: ['lupetti'] });
    expect(puoModificareUnita(u, 'lupetti')).toBe(true);
    expect(puoModificareUnita(u, 'coccinelle')).toBe(false);
  });

  it('un capo in sola lettura non modifica nulla', () => {
    const u = utente({});
    expect(puoModificareUnita(u, 'lupetti')).toBe(false);
    expect(puoModificareAssociato(u, { id: 1, unitaId: 'lupetti', eCapo: false })).toBe(false);
  });

  it('accesso completo modifica ogni unità e ogni capo', () => {
    const u = utente({ accessoCompleto: true });
    expect(puoModificareUnita(u, 'clan')).toBe(true);
    expect(puoModificareAssociato(u, { id: 9, unitaId: 'coca', eCapo: true })).toBe(true);
  });

  it('i dati di un capo li modifica solo il capo stesso (o accesso completo)', () => {
    const collega = utente({ unita: ['coca'], associatoId: 1 });
    expect(puoModificareAssociato(collega, { id: 2, unitaId: 'coca', eCapo: true })).toBe(false);
    expect(puoModificareAssociato(collega, { id: 1, unitaId: 'coca', eCapo: true })).toBe(true);
  });

  it('un associato senza unità lo modifica solo chi ha accesso completo', () => {
    expect(
      puoModificareAssociato(utente({ unita: ['lupetti'] }), {
        id: 3,
        unitaId: null,
        eCapo: false,
      }),
    ).toBe(false);
  });

  it("chi conferma su Buona Strada non può essere l'autore, nemmeno con accesso completo", () => {
    const u = utente({ email: 'bs@example.org', buonaStrada: true, accessoCompleto: true });
    expect(puoConfermareBuonaStrada(u, 'bs@example.org')).toBe(false);
    expect(puoConfermareBuonaStrada(u, 'BS@example.org')).toBe(false);
    expect(puoConfermareBuonaStrada(u, 'altro@example.org')).toBe(true);
    expect(puoConfermareBuonaStrada(utente({}), 'altro@example.org')).toBe(false);
  });

  it('solo il webmaster amministra', () => {
    expect(puoAmministrare(utente({ webmaster: true }))).toBe(true);
    expect(puoAmministrare(utente({ accessoCompleto: true }))).toBe(false);
  });
});
