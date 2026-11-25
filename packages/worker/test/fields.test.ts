import { describe, expect, it } from 'vitest';
import { GUARDIAN_FIELDS, MEMBER_FIELDS, sensitiveFields } from '../src/domain/fields.ts';

describe('fields', () => {
  it('tax code and residence address are the sensitive member fields', () => {
    expect(sensitiveFields(MEMBER_FIELDS).sort()).toEqual(
      ['cap', 'codice_fiscale', 'comune', 'indirizzo', 'provincia'].sort(),
    );
  });

  it('the tax code is the only sensitive guardian field', () => {
    expect(sensitiveFields(GUARDIAN_FIELDS)).toEqual(['codice_fiscale']);
  });
});
