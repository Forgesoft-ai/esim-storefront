/**
 * Which of Atli's environments the store talks to, and whose referral code it
 * sells under there.
 *
 * The visitor picks Sandbox or Production with the switch in the header; the
 * choice is kept in this browser and holds for the whole page, so switching
 * reloads it. Production is the default; a build can start on Sandbox (test
 * cards only, nothing real charged or delivered) with `VITE_ATLI_ENV=sandbox`.
 * A build with `VITE_ATLI_ENV_SWITCH=off` hides the switch and stays on its
 * default, whatever the visitor chose before.
 *
 * Every person this store creates is linked to the environment's referral
 * code (`POST /user/referral/redeem`), so their purchases count for that
 * partner. Fork the store and put your own codes here: get them at
 * https://partners.heyatli.com.
 *
 * By default the browser never calls Atli's API directly: it calls the
 * store's own `/api/<environment>/…`, which the proxy (or Vite, in
 * development) forwards to that environment's API (worker/upstream.js). A
 * store on an address Atli's API accepts browser calls from can skip the
 * proxy: build it with `VITE_ATLI_API=direct`.
 */

export type EnvironmentName = 'sandbox' | 'production';

export interface Environment {
  name: EnvironmentName;
  /** Where the browser sends this environment's API calls, through the proxy: the store's own address. */
  apiPath: string;
  /** This environment's API itself, for a store built to call it directly. Same as worker/upstream.js. */
  apiUrl: string;
  /** Atli's site, for its flags, art, destinations and eSIM page. */
  siteBase: string;
  /** The partner code new guests are linked to. */
  referralCode: string;
}

export const ENVIRONMENTS: Record<EnvironmentName, Environment> = {
  sandbox: {
    name: 'sandbox',
    apiPath: '/api/sandbox',
    apiUrl: 'https://api-staging.heyatli.com',
    siteBase: 'https://staging.heyatli.com',
    referralCode: 'DMITRY-STG',
  },
  production: {
    name: 'production',
    apiPath: '/api/production',
    apiUrl: 'https://api.heyatli.com',
    siteBase: 'https://heyatli.com',
    referralCode: 'ATLI-8CS9',
  },
};

const STORAGE_KEY = 'esim-storefront:environment';

export const isEnvironmentName = (value: unknown): value is EnvironmentName =>
  value === 'sandbox' || value === 'production';

/** The build's environment: Production unless it says Sandbox. */
export const DEFAULT_ENVIRONMENT: EnvironmentName =
  import.meta.env.VITE_ATLI_ENV === 'sandbox' ? 'sandbox' : 'production';

/** Whether the visitor may switch environments; a build can lock the store to its default. */
export const CAN_SWITCH_ENVIRONMENT = import.meta.env.VITE_ATLI_ENV_SWITCH !== 'off';

function initialEnvironment(): EnvironmentName {
  if (!CAN_SWITCH_ENVIRONMENT) return DEFAULT_ENVIRONMENT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isEnvironmentName(stored)) return stored;
  } catch {
    // No storage: the build's default.
  }
  return DEFAULT_ENVIRONMENT;
}

/** The environment for this page load. */
export const ENV: Environment = ENVIRONMENTS[initialEnvironment()];

export const IS_SANDBOX = ENV.name === 'sandbox';

/** Whether this build calls Atli's API directly (`VITE_ATLI_API=direct`) rather than through the proxy. */
export const DIRECT_API = import.meta.env.VITE_ATLI_API === 'direct';

/** The address of one of the API's paths, for this build and environment. */
export function apiUrl(path: string, environment: Environment = ENV, direct = DIRECT_API): URL {
  return new URL(`${direct ? environment.apiUrl : environment.apiPath}${path}`, window.location.origin);
}

/** Remember an environment for the next page load. */
export function rememberEnvironment(name: EnvironmentName) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Without storage the switch can't hold; the build's default stays.
  }
}

/**
 * Switch to another environment: everything on the page (plans, prices, the
 * guest and its eSIMs, Stripe) belongs to one, so the page starts again.
 */
export function switchEnvironment(name: EnvironmentName) {
  if (name === ENV.name || !CAN_SWITCH_ENVIRONMENT) return;
  rememberEnvironment(name);
  window.location.reload();
}
