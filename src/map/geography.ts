import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-50m.json';

countries.registerLocale(en);

export interface CountryFeature extends Feature<Geometry, { name: string }> {
  /** Lower-case ISO 3166-1 alpha-2 code, or '' where the map has none. */
  code: string;
}

/** Natural Earth leaves a few places without an ISO number. */
const BY_NAME: Record<string, string> = { Kosovo: 'xk' };

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>;

/** Antarctica is left off: nobody buys an eSIM for it, and it takes a fifth of the map. */
const LEFT_OUT = new Set(['aq']);

export const COUNTRY_FEATURES: CountryFeature[] = collection.features
  .map((f) => {
    const alpha2 = f.id ? countries.numericToAlpha2(String(f.id)) : undefined;
    return { ...f, code: (alpha2 ?? BY_NAME[f.properties.name] ?? '').toLowerCase() };
  })
  .filter((f) => !LEFT_OUT.has(f.code));

/**
 * Places Atli sells plans for that are too small, or too new a code, to have
 * a shape on a 1:50m map. They're drawn as dots at [longitude, latitude].
 */
export const DOT_COUNTRIES: Record<string, [number, number]> = {
  gi: [-5.35, 36.14], // Gibraltar
  gf: [-53.13, 3.93], // French Guiana
  gp: [-61.55, 16.25], // Guadeloupe
  mq: [-61.02, 14.64], // Martinique
  re: [55.54, -21.12], // Réunion
  yt: [45.17, -12.83], // Mayotte
  an: [-68.99, 12.17], // Netherlands Antilles (Curaçao)
};

export function countryName(code: string): string | undefined {
  return countries.getName(code.toUpperCase(), 'en') ?? undefined;
}
