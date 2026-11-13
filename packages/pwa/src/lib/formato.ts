/** 2016-04-03 → 03/04/2016 */
export function data(iso: string | null): string {
  if (!iso) return '';
  const [a, m, g] = iso.slice(0, 10).split('-');
  return a && m && g ? `${g}/${m}/${a}` : iso;
}

export function telefonoHref(numero: string): string {
  return `tel:${numero.replace(/\s/g, '')}`;
}

const ETICHETTE_RELAZIONE: Record<string, string> = {
  genitore: 'Genitore di',
  figlio: 'Figlio/a di',
  fratello: 'Fratello/sorella di',
  zio: 'Zio/a di',
  nipote: 'Nipote di',
  cugino: 'Cugino/a di',
  coniuge: 'Coniuge di',
  altro: 'Legato a',
};

export const relazione = (tipo: string): string => ETICHETTE_RELAZIONE[tipo] ?? tipo;

export const iniziali = (cognome: string, nome: string): string =>
  `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();
