/**
 * Which of Atli's environments the store talks to, and whose referral code it
 * sells under there.
 *
 * The visitor picks Sandbox or Production with the switch in the header; the
 * choice is kept in this browser and holds for the whole page, so switching
 * reloads it. Sandbox is the default: test cards only, nothing real is
 * charged or delivered. A build can start on production with
 * `VITE_ATLI_ENV=production`.
 *
 * Every person this store creates is linked to the environment's referral
 * code (`POST /user/referral/redeem`), so their purchases count for that
 * partner. Fork the store and put your own codes here: get them at
 * https://partners.heyatli.com.
 *
 * The browser never calls Atli's API directly: it calls the store's own
 * `/api/<environment>/…`, which the proxy (or Vite, in development) forwards
 * to that environment's API (worker/upstream.js).
 */

export type EnvironmentName = 'sandbox' | 'production';

export interface Environment {
  name: EnvironmentName;
  /** Where the browser sends this environment's API calls: the store's own address. */
  apiPath: string;
  /** Atli's site, for its flags, art, destinations and eSIM page. */
  siteBase: string;
  /** The partner code new guests are linked to. */
  referralCode: string;
}

export const ENVIRONMENTS: Record<EnvironmentName, Environment> = {
  sandbox: {
    name: 'sandbox',
    apiPath: '/api/sandbox',
    siteBase: 'https://staging.heyatli.com',
    referralCode: 'DMITRY-STG',
  },
  production: {
    name: 'production',
    apiPath: '/api/production',
    siteBase: 'https://heyatli.com',
    referralCode: 'ATLI-8CS9',
  },
};

const STORAGE_KEY = 'esim-storefront:environment';

export const isEnvironmentName = (value: unknown): value is EnvironmentName =>
  value === 'sandbox' || value === 'production';

function initialEnvironment(): EnvironmentName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isEnvironmentName(stored)) return stored;
  } catch {
    // No storage: the build's default.
  }
  return import.meta.env.VITE_ATLI_ENV === 'production' ? 'production' : 'sandbox';
}

/** The environment for this page load. */
export const ENV: Environment = ENVIRONMENTS[initialEnvironment()];

export const IS_SANDBOX = ENV.name === 'sandbox';

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
  if (name === ENV.name) return;
  rememberEnvironment(name);
  window.location.reload();
}
