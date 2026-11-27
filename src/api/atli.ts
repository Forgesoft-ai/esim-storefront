import { ENV } from '../config';

/**
 * A tiny client for the parts of Atli's eSIM API this storefront uses.
 *
 * Which API it calls is set in src/config.ts. The showcase uses Atli's Sandbox
 * (staging): its accounts are separate from real ones, it takes test cards
 * only, and its eSIMs can't be installed on a phone.
 *
 * API reference: https://partners.heyatli.com/dev/api
 * OpenAPI file:  https://api-staging.heyatli.com/openapi.yaml
 */

const API_BASE = ENV.apiBase;

/** One package: an amount of data for a number of days, at a price. */
export interface Package {
  /** The `product_id` you quote and buy. */
  id: string;
  title: string;
  data_amount: string;
  data_amount_gb: number;
  validity: string;
  validity_days: number;
  is_unlimited?: boolean;
  is_popular?: boolean;
  /** Price in the currency the catalogue was asked for. */
  price_display: number;
  price_usd: number;
  currency: string;
  traffic_policy?: string;
  required_manual_apn?: boolean;
}

/** A plan: one country (`local`), a region (`regional`) or the world (`global`). */
export interface Plan {
  /** A country's ISO code (`jp`) for a local plan, or a name such as `europe`. */
  id: string;
  name: string;
  title: string;
  flag_emoji?: string;
  category: 'local' | 'regional' | 'global' | (string & {});
  /** Lower-case ISO codes of every country the plan covers. */
  countries: string[];
  carrier_networks: string[];
  network_types: string[];
  min_price_display: number;
  currency: string;
  is_popular?: boolean;
  packages: Package[];
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimal_digits: number;
}

/** Every failed request has the same body. Branch on `code`, never on `message`. */
export class AtliError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;

  constructor(status: number, code: string, message: string, traceId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

async function get<T>(path: string, params: Record<string, string> = {}, locale?: string): Promise<T> {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response: Response;
  try {
    // X-Locale names plans and packages in that language; prices follow `currency`.
    response = await fetch(url, { headers: { Accept: 'application/json', ...(locale ? { 'X-Locale': locale } : {}) } });
  } catch {
    // The API only answers browsers on origins it allows. See the README's "Running it" section.
    throw new AtliError(0, 'network_error', `Couldn't reach ${API_BASE}. Is this origin allowed?`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AtliError(response.status, body.code ?? 'unknown', body.message ?? response.statusText, body.trace_id);
  }
  return response.json() as Promise<T>;
}

/**
 * The whole catalogue, priced in one currency. `GET /explore/plans` needs no
 * token, so the store can show plans before anyone has an account.
 */
export function fetchPlans(currency: string, locale: string): Promise<Plan[]> {
  return get<Plan[]>('/explore/plans', { currency }, locale);
}

/** The currencies plans can be priced in. */
export function fetchCurrencies(): Promise<Currency[]> {
  return get<Currency[]>('/currencies');
}
