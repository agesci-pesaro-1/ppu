// Field metadata: which fields are Buona Strada personal data and which are sensitive.
// Normal views do not show sensitive fields; reading them is logged in `accessi`.
// Keys are the schema's column names.

export interface FieldMeta {
  /** Personal data field to be reported on Buona Strada when it changes. */
  buonaStrada: boolean;
  /** Not shown in normal views; reading it is logged. */
  sensitive: boolean;
}

const bs = (sensitive = false): FieldMeta => ({ buonaStrada: true, sensitive });
const plain: FieldMeta = { buonaStrada: false, sensitive: false };

export const MEMBER_FIELDS = {
  codice_censimento: bs(),
  cognome: bs(),
  nome: bs(),
  data_nascita: bs(),
  luogo_nascita: bs(),
  codice_fiscale: bs(true),
  unita_id: bs(),
  indirizzo: bs(true),
  cap: bs(true),
  comune: bs(true),
  provincia: bs(true),
  cellulare: bs(),
  email: bs(),
  riceve_comunicazioni: plain,
  informativa: bs(),
  informativa_data: bs(),
  consenso_2a: bs(),
  consenso_2b: bs(),
  consenso_2c: bs(),
  note_privacy: plain,
} as const satisfies Record<string, FieldMeta>;

export const GUARDIAN_FIELDS = {
  ruolo: bs(),
  cognome: bs(),
  nome: bs(),
  data_nascita: bs(),
  luogo_nascita: bs(),
  codice_fiscale: bs(true),
  cellulare: bs(),
  email: bs(),
  associato_collegato_id: plain,
} as const satisfies Record<string, FieldMeta>;

export type MemberField = keyof typeof MEMBER_FIELDS;
export type GuardianField = keyof typeof GUARDIAN_FIELDS;

export function sensitiveFields(meta: Record<string, FieldMeta>): string[] {
  return Object.entries(meta)
    .filter(([, m]) => m.sensitive)
    .map(([field]) => field);
}
