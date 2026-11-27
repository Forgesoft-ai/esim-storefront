/**
 * Where the store's /api/… calls go: Atli's eSIM API for the environment.
 * Shared by the development server (vite.config.ts) and the proxy
 * (worker/index.js), so both forward to the same place.
 */

export const UPSTREAMS = {
  staging: 'https://api-staging.heyatli.com',
  production: 'https://api.heyatli.com',
};

/**
 * The API for an environment name, `staging` unless it says `production`.
 * `override`, when set, wins: a fork or a local gateway.
 *
 * @param {string | undefined} environment
 * @param {string | undefined} [override]
 */
export function upstreamFor(environment, override) {
  if (override) return override.replace(/\/+$/, '');
  return environment === 'production' ? UPSTREAMS.production : UPSTREAMS.staging;
}
