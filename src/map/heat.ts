import type { Catalogue } from '../catalogue';

/**
 * The price heatmap: each country coloured by the lowest price that covers
 * it, from its own plan or any regional or global one. Green is cheapest, red
 * dearest, in seven steps.
 */

/**
 * Green to red in seven steps, as CSS variables (styles.css): each theme has
 * its own muted scale, so the map stays calm in light and in dark.
 */
export const HEAT_COLORS = Array.from({ length: 7 }, (_, i) => `var(--heat-${i})`);

/** The lowest starting price covering each country, in the catalogue's currency. */
export function lowestPrices(catalogue: Catalogue): Map<string, number> {
  const lowest = new Map<string, number>();
  for (const plan of catalogue.plans) {
    for (const code of plan.countries) {
      const current = lowest.get(code);
      if (current === undefined || plan.min_price_display < current) lowest.set(code, plan.min_price_display);
    }
  }
  return lowest;
}

export interface HeatScale {
  /** A country's colour, or undefined where nothing is sold. */
  color: (code: string) => string | undefined;
  /** The cheapest and the dearest lowest price, for the legend. */
  min: number;
  max: number;
}

/**
 * Steps by rank rather than by amount, so a few very dear countries don't
 * squeeze everyone else into one colour.
 */
export function heatScale(prices: Map<string, number>): HeatScale | null {
  const sorted = [...prices.values()].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const steps = HEAT_COLORS.length;
  // The highest price in each step but the last.
  const thresholds = Array.from(
    { length: steps - 1 },
    (_, i) => sorted[Math.floor(((i + 1) * sorted.length) / steps) - 1],
  );
  const colorOf = (price: number) => HEAT_COLORS[thresholds.filter((top) => price > top).length];
  return {
    color: (code) => {
      const price = prices.get(code);
      return price === undefined ? undefined : colorOf(price);
    },
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
