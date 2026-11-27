/**
 * Where the store's API calls go. The browser calls `/api/<environment>/…`,
 * and both the development server (vite.config.ts) and the proxy
 * (worker/index.js) forward that to Atli's eSIM API for the environment.
 */

export const UPSTREAMS = {
  sandbox: 'https://api-staging.heyatli.com',
  production: 'https://api.heyatli.com',
};

/** @typedef {keyof typeof UPSTREAMS} Environment */

/** @param {string} value @returns {value is Environment} */
export const isEnvironment = (value) => Object.hasOwn(UPSTREAMS, value);

/**
 * The API for an environment. `overrides`, read from the environment variables
 * ATLI_SANDBOX_API and ATLI_PRODUCTION_API, point either one elsewhere: a fork
 * or a local gateway.
 *
 * @param {Environment} environment
 * @param {{ ATLI_SANDBOX_API?: string, ATLI_PRODUCTION_API?: string }} [overrides]
 */
export function upstreamFor(environment, overrides = {}) {
  const override = environment === 'production' ? overrides.ATLI_PRODUCTION_API : overrides.ATLI_SANDBOX_API;
  return (override || UPSTREAMS[environment]).replace(/\/+$/, '');
}
