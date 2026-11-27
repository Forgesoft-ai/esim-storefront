import { describe, expect, it } from 'vitest';

import type { Plan } from '../api/atli';
import { buildCatalogue } from '../catalogue';
import { HEAT_COLORS, heatScale, lowestPrices } from './heat';

const plan = (id: string, category: Plan['category'], countries: string[], from: number): Plan => ({
  id,
  name: id,
  title: id,
  category,
  countries,
  carrier_networks: [],
  network_types: [],
  min_price_display: from,
  currency: 'USD',
  packages: [],
});

describe('lowestPrices', () => {
  it("takes the cheapest plan covering each country, its own or a region's", () => {
    const catalogue = buildCatalogue(
      [
        plan('jp', 'local', ['jp'], 4.99),
        plan('fr', 'local', ['fr'], 3.99),
        plan('asia', 'regional', ['jp', 'kr'], 5.99),
      ],
      () => undefined,
    );
    expect(Object.fromEntries(lowestPrices(catalogue))).toEqual({ jp: 4.99, fr: 3.99, kr: 5.99 });
  });
});

describe('heatScale', () => {
  const prices = new Map(Array.from({ length: 14 }, (_, i) => [`c${i}`, i + 1] as const));
  const scale = heatScale(prices)!;

  it('runs green for the cheapest to red for the dearest', () => {
    expect(scale.color('c0')).toBe(HEAT_COLORS[0]);
    expect(scale.color('c13')).toBe(HEAT_COLORS[HEAT_COLORS.length - 1]);
    expect(scale.min).toBe(1);
    expect(scale.max).toBe(14);
  });

  it('uses every colour for evenly spread prices', () => {
    expect(new Set([...prices.keys()].map(scale.color)).size).toBe(HEAT_COLORS.length);
  });

  it("isn't flattened by one very dear country", () => {
    const skewed = new Map([...prices, ['dear', 500]]);
    const colors = new Set([...skewed.keys()].map(heatScale(skewed)!.color));
    expect(colors.size).toBeGreaterThan(4);
  });

  it('leaves countries without a price uncoloured, and has nothing to scale with no prices', () => {
    expect(scale.color('xx')).toBeUndefined();
    expect(heatScale(new Map())).toBeNull();
  });
});
