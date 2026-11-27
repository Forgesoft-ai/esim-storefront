import type { Plan } from './api/atli';
import { ENV } from './config';

/**
 * Atli's flags and destination art, the same ones heyatli.com shows.
 *
 * Art is the "Papercut World" set on art.heyatli.com: one 21:9 panorama per
 * country and region, resized by Cloudflare. Ask only for these widths, the
 * ones Atli keeps warm; any other is a fresh transformation.
 */

const ART_ORIGIN = 'https://art.heyatli.com';
const ART_WIDTHS = [400, 800, 1200] as const;
const ART_QUALITY = 75;

/** Shown when a picture is missing or can't load. */
export const FALLBACK_ART = `${ENV.siteBase}/default-destination.webp`;

/** The regions with art and a flag of their own. Any other borrows Global's. */
const REGION_ART = new Set([
  'europe',
  'asia',
  'south_east_asia',
  'north_america',
  'latin_america',
  'middle_east',
  'africa',
  'global',
]);

export type ArtSubject = { kind: 'country'; code: string } | { kind: 'region'; id: string };

function artCode(subject: ArtSubject): string {
  return subject.kind === 'country' ? subject.code.toLowerCase() : REGION_ART.has(subject.id) ? subject.id : 'global';
}

export function flagSrc(subject: ArtSubject): string {
  return `${ENV.siteBase}/flags/${artCode(subject)}.svg`;
}

function bannerUrl(subject: ArtSubject, width: number): string {
  const folder = subject.kind === 'country' ? 'countries' : 'regions';
  return `${ART_ORIGIN}/cdn-cgi/image/width=${width},quality=${ART_QUALITY},format=auto/banners/${folder}/${artCode(subject)}.webp`;
}

export function bannerSources(subject: ArtSubject): { src: string; srcSet: string } {
  return {
    src: bannerUrl(subject, 800),
    srcSet: ART_WIDTHS.map((w) => `${bannerUrl(subject, w)} ${w}w`).join(', '),
  };
}

/** A local plan wears its country's flag and art; a regional or global one its region's. */
export function planSubject(plan: Pick<Plan, 'category' | 'id'>): ArtSubject {
  return plan.category === 'local' ? { kind: 'country', code: plan.id } : { kind: 'region', id: plan.id };
}
