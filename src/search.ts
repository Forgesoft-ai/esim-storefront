/** Lower case, without accents: "Côte d'Ivoire" matches "cote". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export interface Searchable {
  /** The name shown. */
  label: string;
  /** Everything a query may match: names and codes, already folded. */
  haystack: string;
}

/**
 * The options a query finds, best first: the exact name, then names that start
 * with it, then names with a word that does, then names that only contain it.
 * Within each group the options keep their own order. "tokyo" finds Tokyo
 * before Tokyo Metropolis.
 */
export function rankMatches<T extends Searchable>(options: T[], query: string, limit = 8): T[] {
  const q = fold(query.trim());
  if (!q) return [];
  const name = (o: T) => fold(o.label);
  const exact = options.filter((o) => name(o) === q);
  const starts = options.filter((o) => !exact.includes(o) && name(o).startsWith(q));
  const word = options.filter(
    (o) => !exact.includes(o) && !starts.includes(o) && (o.haystack.startsWith(q) || o.haystack.includes(` ${q}`)),
  );
  const seen = new Set([...exact, ...starts, ...word]);
  const contains = options.filter((o) => !seen.has(o) && o.haystack.includes(q));
  return [...exact, ...starts, ...word, ...contains].slice(0, limit);
}
