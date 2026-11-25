/** 2016-04-03 → 03/04/2016 */
export function date(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function phoneHref(number: string): string {
  return `tel:${number.replace(/\s/g, '')}`;
}

// Labels shown to the user, by `relazioni.tipo`.
const RELATIONSHIP_LABELS: Record<string, string> = {
  genitore: 'Genitore di',
  figlio: 'Figlio/a di',
  fratello: 'Fratello/sorella di',
  zio: 'Zio/a di',
  nipote: 'Nipote di',
  cugino: 'Cugino/a di',
  altro: 'Legato a',
};

export const relationshipLabel = (type: string): string => RELATIONSHIP_LABELS[type] ?? type;

export const initials = (lastName: string, firstName: string): string =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
