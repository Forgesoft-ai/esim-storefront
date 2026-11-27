import { ENV } from '../config';

/**
 * heyatli.com's own small public API: here, every destination it has a page
 * for, in one call. It answers any origin, so a browser can read it directly.
 *
 * Reference: https://partners.heyatli.com/dev/api/reference-heyatli-com
 * Spec:      https://staging.heyatli.com/api/openapi.yaml
 */

interface Common {
  slug: string;
  name: string;
  /** The code its flag and art are filed under: `JP`, or a region id such as `europe`. */
  flagCode: string;
  emoji: string;
  priceUsd: number;
  /** Its page on heyatli.com. */
  url: string;
  flagUrl: string;
}

/**
 * We sell country and region plans, not state or city ones: a state or city
 * sells the plan of the country it's in. Which plan each type sells:
 *
 * | type    | ask /explore/plans for | plan                         |
 * | ------- | ---------------------- | ---------------------------- |
 * | country | its `iso`              | the country's own            |
 * | region  | its `regionId`         | the regional or global one   |
 * | state   | its `countryIso`       | its country's                |
 * | city    | its `countryIso`       | its country's                |
 */
export type SiteDestination =
  | (Common & { type: 'country'; iso: string })
  | (Common & { type: 'region'; regionId: string })
  | (Common & { type: 'state'; countryIso: string })
  | (Common & { type: 'city'; countryIso: string; population?: number });

interface DestinationList {
  locale: string;
  total: number;
  destinations: SiteDestination[];
}

/** Every country, region, state and city, named in `locale`. */
export async function fetchDestinations(locale = 'en'): Promise<SiteDestination[]> {
  const response = await fetch(`${ENV.siteBase}/api/destinations/all`, { headers: { 'X-Locale': locale } });
  if (!response.ok) throw new Error(`Destinations answered ${response.status}`);
  const body = (await response.json()) as DestinationList;
  return body.destinations;
}
