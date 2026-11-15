// Metadati dei campi: quali sono anagrafica "Buona Strada" e quali sensibili.
// Le viste normali non mostrano i campi sensibili; leggerli si registra in `accessi`.

export interface MetaCampo {
  /** Campo anagrafico da riportare su Buona Strada quando cambia. */
  buonaStrada: boolean;
  /** Non compare nelle viste normali; la lettura si registra. */
  sensibile: boolean;
}

const bs = (sensibile = false): MetaCampo => ({ buonaStrada: true, sensibile });
const libero: MetaCampo = { buonaStrada: false, sensibile: false };

export const CAMPI_ASSOCIATI = {
  codice_censimento: bs(),
  cognome: bs(),
  nome: bs(),
  data_nascita: bs(),
  luogo_nascita: bs(),
  codice_fiscale: bs(true),
  unita_id: bs(),
  indirizzo: bs(),
  cap: bs(),
  comune: bs(),
  provincia: bs(),
  cellulare: bs(),
  telefono_casa: bs(),
  email: bs(),
  informativa: bs(),
  informativa_data: bs(),
  consenso_2a: bs(),
  consenso_2b: bs(),
  consenso_2c: bs(),
  note_privacy: libero,
} as const satisfies Record<string, MetaCampo>;

export const CAMPI_TUTORI = {
  relazione: bs(),
  cognome: bs(),
  nome: bs(),
  data_nascita: bs(),
  luogo_nascita: bs(),
  codice_fiscale: bs(true),
  cellulare: bs(),
  email: bs(),
  riceve_comunicazioni: libero,
  associato_collegato_id: libero,
} as const satisfies Record<string, MetaCampo>;

export type CampoAssociato = keyof typeof CAMPI_ASSOCIATI;
export type CampoTutore = keyof typeof CAMPI_TUTORI;

export function campiSensibili(meta: Record<string, MetaCampo>): string[] {
  return Object.entries(meta)
    .filter(([, m]) => m.sensibile)
    .map(([c]) => c);
}
