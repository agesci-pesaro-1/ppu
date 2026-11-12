// Parser CSV minimale (RFC 4180): virgolette, virgolette raddoppiate, a capo
// dentro i campi, BOM iniziale, separatore ';' ',' o tabulazione rilevato
// dalla riga di intestazione. Nessuna dipendenza esterna.

export interface RigaCsv {
  /** Riga del file in cui inizia il record (l'intestazione è la riga 1). */
  numero: number;
  valori: string[];
}

export interface TabellaCsv {
  separatore: string;
  intestazioni: string[];
  righe: RigaCsv[];
}

export class ErroreCsv extends Error {}

const SEPARATORI = [';', ',', '\t'] as const;

/** Sceglie il separatore più frequente fuori dalle virgolette nella prima riga. */
export function rilevaSeparatore(testo: string): string {
  const conteggi = new Map<string, number>(SEPARATORI.map((s) => [s, 0]));
  let traVirgolette = false;
  for (const ch of testo) {
    if (ch === '"') traVirgolette = !traVirgolette;
    else if (!traVirgolette && (ch === '\n' || ch === '\r')) break;
    else if (!traVirgolette && conteggi.has(ch)) conteggi.set(ch, (conteggi.get(ch) ?? 0) + 1);
  }
  let migliore = ',';
  let massimo = 0;
  for (const [s, n] of conteggi) {
    if (n > massimo) {
      migliore = s;
      massimo = n;
    }
  }
  return migliore;
}

function record(testo: string, separatore: string): RigaCsv[] {
  const risultato: RigaCsv[] = [];
  let campo = '';
  let valori: string[] = [];
  let traVirgolette = false;
  let riga = 1;
  let inizio = 1;
  const chiudi = () => {
    valori.push(campo);
    risultato.push({ numero: inizio, valori });
    valori = [];
    campo = '';
  };
  for (let i = 0; i < testo.length; i += 1) {
    const ch = testo[i];
    if (traVirgolette) {
      if (ch === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          traVirgolette = false;
        }
      } else {
        if (ch === '\n') riga += 1;
        campo += ch;
      }
    } else if (ch === '"' && campo === '') {
      traVirgolette = true;
    } else if (ch === separatore) {
      valori.push(campo);
      campo = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && testo[i + 1] === '\n') i += 1;
      chiudi();
      riga += 1;
      inizio = riga;
    } else {
      campo += ch;
    }
  }
  if (traVirgolette) throw new ErroreCsv(`Virgolette non chiuse (riga ${inizio}).`);
  if (campo !== '' || valori.length > 0) chiudi();
  return risultato;
}

export function leggiCsv(testo: string): TabellaCsv {
  const pulito = testo.startsWith('﻿') ? testo.slice(1) : testo;
  if (pulito.trim() === '') throw new ErroreCsv('Il file CSV è vuoto.');
  const separatore = rilevaSeparatore(pulito);
  const [intestazione, ...dati] = record(pulito, separatore);
  if (!intestazione) throw new ErroreCsv('Intestazione mancante.');
  const intestazioni = intestazione.valori.map((h) => h.trim());
  const viste = new Set<string>();
  for (const h of intestazioni) {
    const chiave = h.toLowerCase();
    if (h !== '' && viste.has(chiave)) throw new ErroreCsv(`Colonna duplicata: "${h}".`);
    viste.add(chiave);
  }
  const righe = dati.filter((r) => r.valori.some((v) => v.trim() !== ''));
  for (const r of righe) {
    if (r.valori.length > intestazioni.length) {
      throw new ErroreCsv(
        `La riga ${r.numero} ha ${r.valori.length} colonne, l'intestazione ${intestazioni.length}.`,
      );
    }
  }
  return { separatore, intestazioni, righe };
}
