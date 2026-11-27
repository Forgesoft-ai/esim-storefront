import type { Package, Plan } from './api/atli';
import type { SiteDestination } from './api/site';

/** A state or city: it sells the plan of the country it's in. */
export interface Place {
  slug: string;
  type: 'state' | 'city';
  name: string;
  /** Lower-case ISO code of its country. */
  country: string;
  population?: number;
}

/**
 * What the search and the map can select: a country (reached directly, or
 * through one of its states or cities), or a regional or global plan.
 */
export type Destination =
  | { kind: 'country'; code: string; name: string; flag: string; place?: Place }
  | { kind: 'plan'; plan: Plan };

export interface Catalogue {
  plans: Plan[];
  /** Local plans by country code. */
  local: Map<string, Plan>;
  /** Regional and global plans. */
  multi: Plan[];
  /** Every country any plan covers, with its name and flag. */
  countries: Map<string, { name: string; flag: string }>;
  /** States and cities whose country has plans, by slug. */
  places: Map<string, Place>;
  /** Regional plans' names as heyatli.com writes them, by plan id. */
  regionNames: Map<string, string>;
}

/** A country code's flag, from its two regional indicator letters. */
export function flagOf(code: string): string {
  return code.toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

const titleCase = (name: string) => name.toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase());

let regionNames = new Map<string, string>();

/** A plan's name to show, in the catalogue's language: "Middle East", not "MIDDLE EAST". */
export function planName(plan: Plan): string {
  if (plan.category === 'local') return plan.title || plan.name;
  return regionNames.get(plan.id) ?? titleCase(plan.name);
}

export function buildCatalogue(
  plans: Plan[],
  names: (code: string) => string | undefined,
  destinations: SiteDestination[] = [],
): Catalogue {
  const local = new Map<string, Plan>();
  const multi: Plan[] = [];
  const countries = new Map<string, { name: string; flag: string }>();
  for (const plan of plans) {
    if (plan.category !== 'local') {
      multi.push(plan);
      continue;
    }
    // A local plan is its country's own when its id is that country. A few local
    // plans also cover neighbours; they're offered there as another option.
    const own = plan.countries.includes(plan.id) ? plan.id : plan.countries.length === 1 ? plan.countries[0] : null;
    if (own) local.set(own, plan);
  }
  const siteCountries = new Map(
    destinations.flatMap((d) => (d.type === 'country' ? [[d.iso.toLowerCase(), d] as const] : [])),
  );
  for (const plan of plans) {
    for (const code of plan.countries) {
      if (countries.has(code)) continue;
      const own = local.get(code);
      const site = siteCountries.get(code);
      countries.set(code, {
        name: site?.name ?? own?.name ?? names(code) ?? code.toUpperCase(),
        flag: own?.flag_emoji ?? site?.emoji ?? flagOf(code),
      });
    }
  }
  const places = new Map<string, Place>();
  regionNames = new Map();
  for (const d of destinations) {
    if (d.type === 'region') regionNames.set(d.regionId, d.name);
    if (d.type !== 'state' && d.type !== 'city') continue;
    const country = d.countryIso.toLowerCase();
    if (!countries.has(country)) continue;
    places.set(d.slug, {
      slug: d.slug,
      type: d.type,
      name: d.name,
      country,
      population: d.type === 'city' ? d.population : undefined,
    });
  }
  multi.sort((a, b) => a.countries.length - b.countries.length);
  return { plans, local, multi, countries, places, regionNames };
}

/** The plans that cover a country: its own first, then the others, narrowest first. */
export function plansFor(catalogue: Catalogue, code: string): Plan[] {
  const own = catalogue.local.get(code);
  const others = catalogue.plans
    .filter((plan) => plan !== own && plan.countries.includes(code))
    .sort((a, b) => a.countries.length - b.countries.length);
  return own ? [own, ...others] : others;
}

/**
 * The package to start on when a plan opens: the second-cheapest unlimited one,
 * which is usually the most useful length, or the only unlimited one, or with
 * none the cheapest package of all.
 */
export function defaultPackage(plan: Plan): Package | null {
  const byPrice = [...plan.packages].sort((a, b) => a.price_display - b.price_display);
  const unlimited = byPrice.filter((pkg) => pkg.is_unlimited);
  return unlimited[1] ?? unlimited[0] ?? byPrice[0] ?? null;
}

/** Unlimited first, as Atli lists them, then by length and price. */
export function sortPackages(packages: Package[]): Package[] {
  return [...packages].sort(
    (a, b) =>
      Number(Boolean(b.is_unlimited)) - Number(Boolean(a.is_unlimited)) ||
      a.validity_days - b.validity_days ||
      a.price_display - b.price_display,
  );
}

let numberLocale: string | undefined;

/** Prices are written the way the chosen language writes them. */
export function setNumberLocale(locale: string) {
  numberLocale = locale;
}

/** The plan a package belongs to, from its id: what an eSIM's plan names as `product_id`. */
export function planOfPackage(catalogue: Catalogue, packageId: string): Plan | undefined {
  return catalogue.plans.find((plan) => plan.packages.some((pkg) => pkg.id === packageId));
}

export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(numberLocale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
