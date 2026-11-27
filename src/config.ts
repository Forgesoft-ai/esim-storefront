/**
 * Where the store points, and whose referral code it sells under.
 *
 * Every person this store creates is linked to the environment's referral
 * code (`POST /user/referral/redeem`), so their purchases count for that
 * partner. Fork the store and put your own code here: get it at
 * https://partners.heyatli.com.
 *
 * The showcase runs on Sandbox. Production is here so the switch is one
 * setting, `VITE_ATLI_ENV=production`, and nothing else.
 */

export interface Environment {
  name: 'staging' | 'production';
  /** Atli's eSIM API. */
  apiBase: string;
  /** Atli's site, for its payment page (`/pay`) and eSIM page (`/my/esim`). */
  siteBase: string;
  /** The partner code new guests are linked to. */
  referralCode: string;
}

const ENVIRONMENTS: Record<Environment['name'], Environment> = {
  staging: {
    name: 'staging',
    apiBase: 'https://api-staging.heyatli.com',
    siteBase: 'https://staging.heyatli.com',
    referralCode: 'DMITRY-STG',
  },
  production: {
    name: 'production',
    apiBase: 'https://api.heyatli.com',
    siteBase: 'https://heyatli.com',
    referralCode: 'ATLI-8CS9',
  },
};

const requested = import.meta.env.VITE_ATLI_ENV;

export const ENV: Environment = {
  ...(requested === 'production' ? ENVIRONMENTS.production : ENVIRONMENTS.staging),
  // Either may be overridden on its own, for a fork or a local gateway.
  ...(import.meta.env.VITE_ATLI_API_BASE ? { apiBase: import.meta.env.VITE_ATLI_API_BASE } : {}),
  ...(import.meta.env.VITE_ATLI_REFERRAL_CODE ? { referralCode: import.meta.env.VITE_ATLI_REFERRAL_CODE } : {}),
};

export const IS_SANDBOX = ENV.name === 'staging';
