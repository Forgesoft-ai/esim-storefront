/**
 * Where the store points, and whose referral code it sells under.
 *
 * Every person this store creates is linked to the environment's referral
 * code (`POST /user/referral/redeem`), so their purchases count for that
 * partner. Fork the store and put your own code here: get it at
 * https://partners.heyatli.com.
 *
 * The showcase runs on Sandbox. Production is here so the switch is one
 * setting, `VITE_ATLI_ENV=production` (with `ATLI_ENV=production` for the
 * proxy, worker/index.js), and nothing else.
 *
 * The browser never calls Atli's API directly: it calls the store's own
 * `/api/…`, which the proxy (or Vite, in development) forwards to the API for
 * the environment (worker/upstream.js).
 */

/** Where the browser sends its API calls: the store's own address. */
export const API_PATH = '/api';

export interface Environment {
  name: 'staging' | 'production';
  /** Atli's site, for its payment page (`/pay`) and eSIM page (`/my/esim`). */
  siteBase: string;
  /** The partner code new guests are linked to. */
  referralCode: string;
}

const ENVIRONMENTS: Record<Environment['name'], Environment> = {
  staging: {
    name: 'staging',
    siteBase: 'https://staging.heyatli.com',
    referralCode: 'DMITRY-STG',
  },
  production: {
    name: 'production',
    siteBase: 'https://heyatli.com',
    referralCode: 'ATLI-8CS9',
  },
};

const requested = import.meta.env.VITE_ATLI_ENV;

export const ENV: Environment = {
  ...(requested === 'production' ? ENVIRONMENTS.production : ENVIRONMENTS.staging),
  // A fork can sell under its own code without editing this file.
  ...(import.meta.env.VITE_ATLI_REFERRAL_CODE ? { referralCode: import.meta.env.VITE_ATLI_REFERRAL_CODE } : {}),
};

export const IS_SANDBOX = ENV.name === 'staging';
