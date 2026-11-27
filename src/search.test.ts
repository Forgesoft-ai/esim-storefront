import { describe, expect, it } from 'vitest';

import { fold, rankMatches } from './search';

const option = (label: string, extra = '') => ({ label, haystack: fold(`${label} ${extra}`) });

const OPTIONS = [
  option('Japan', 'jp'),
  option('Tokushima Prefecture', 'Japan'),
  option('Tokyo Metropolis', 'Japan'),
  option('Tokyo', 'Japan'),
  option("Côte d'Ivoire", 'ci'),
  option('Middle East', 'middle_east regional'),
];

const labels = (query: string) => rankMatches(OPTIONS, query).map((o) => o.label);

describe('rankMatches', () => {
  it('puts the exact name first', () => {
    expect(labels('tokyo')).toEqual(['Tokyo', 'Tokyo Metropolis']);
  });

  it('then names that start with the query, in their own order', () => {
    expect(labels('tok')).toEqual(['Tokushima Prefecture', 'Tokyo Metropolis', 'Tokyo']);
  });

  it('finds a word inside the name, and what the name only contains last', () => {
    expect(labels('east')).toEqual(['Middle East']);
    expect(labels('apa')).toEqual(['Japan', 'Tokushima Prefecture', 'Tokyo Metropolis', 'Tokyo']);
  });

  it('ignores accents and case', () => {
    expect(labels('COTE')).toEqual(["Côte d'Ivoire"]);
  });

  it('matches codes and other names in the haystack', () => {
    expect(labels('jp')).toEqual(['Japan']);
  });

  it('returns nothing for an empty query, and at most the limit', () => {
    expect(labels('  ')).toEqual([]);
    expect(rankMatches(OPTIONS, 'o', 2)).toHaveLength(2);
  });
});
