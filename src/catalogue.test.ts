import { describe, expect, it } from 'vitest';

import type { Package, Plan } from './api/atli';
import { buildCatalogue, defaultPackage, plansFor, sortPackages } from './catalogue';

function pkg(id: string, price: number, days: number, unlimited = false): Package {
  return {
    id,
    title: id,
    data_amount: unlimited ? 'Unlimited' : '1 GB',
    data_amount_gb: unlimited ? 0 : 1,
    validity: `${days} days`,
    validity_days: days,
    is_unlimited: unlimited,
    price_display: price,
    price_usd: price,
    currency: 'USD',
  };
}

function plan(id: string, category: Plan['category'], countries: string[], packages: Package[] = []): Plan {
  return {
    id,
    name: id.toUpperCase(),
    title: id,
    category,
    countries,
    carrier_networks: [],
    network_types: [],
    min_price_display: Math.min(...packages.map((p) => p.price_display), 0),
    currency: 'USD',
    packages,
  };
}

const th = plan('th', 'local', ['th']);
// On Sandbox the Brunei plan is "local" yet covers its neighbours, Thailand included.
const bn = plan('bn', 'local', ['bn', 'th', 'my']);
const asia = plan('asia', 'regional', ['th', 'my', 'jp', 'bn']);
const global = plan('global', 'global', ['th', 'my', 'jp', 'bn', 'fr']);
const catalogue = buildCatalogue([global, asia, bn, th], () => undefined);

describe('buildCatalogue', () => {
  it("gives a country its own plan, even when a neighbour's local plan covers it too", () => {
    expect(catalogue.local.get('th')).toBe(th);
    expect(catalogue.local.get('bn')).toBe(bn);
    expect(catalogue.local.has('my')).toBe(false);
  });

  it('lists every country any plan covers', () => {
    expect([...catalogue.countries.keys()].sort()).toEqual(['bn', 'fr', 'jp', 'my', 'th']);
  });
});

describe('plansFor', () => {
  it("puts the country's own plan first, then the others narrowest first", () => {
    expect(plansFor(catalogue, 'th').map((p) => p.id)).toEqual(['th', 'bn', 'asia', 'global']);
  });

  it('offers only multi-country plans where a country has none of its own', () => {
    expect(plansFor(catalogue, 'my').map((p) => p.id)).toEqual(['bn', 'asia', 'global']);
  });
});

describe('defaultPackage', () => {
  it('picks the second-cheapest unlimited package', () => {
    const p = plan(
      'jp',
      'local',
      ['jp'],
      [pkg('u7', 21.99, 7, true), pkg('u5', 16.99, 5, true), pkg('u10', 29.99, 10, true), pkg('g1', 4.99, 7)],
    );
    expect(defaultPackage(p)?.id).toBe('u7');
  });

  it('takes the only unlimited package when there is one', () => {
    expect(defaultPackage(plan('x', 'local', ['x'], [pkg('u', 20, 5, true), pkg('g', 3, 7)]))?.id).toBe('u');
  });

  it('falls back to the cheapest package without unlimited ones', () => {
    expect(defaultPackage(plan('x', 'local', ['x'], [pkg('b', 10, 30), pkg('a', 3, 7)]))?.id).toBe('a');
  });

  it('has nothing to pick from an empty plan', () => {
    expect(defaultPackage(plan('x', 'local', ['x']))).toBeNull();
  });
});

describe('sortPackages', () => {
  it('lists unlimited first, then by length and price', () => {
    const sorted = sortPackages([pkg('g30', 10, 30), pkg('u7', 22, 7, true), pkg('g7', 5, 7), pkg('u5', 17, 5, true)]);
    expect(sorted.map((p) => p.id)).toEqual(['u5', 'u7', 'g7', 'g30']);
  });
});
