import { upstreamFor } from './upstream.js';

/**
 * The store's server half, and all of it: serve the built store, and forward
 * its /api/… calls to Atli's eSIM API, so the browser only ever talks to the
 * store's own address.
 *
 * It's a Fetch-API module (`export default { fetch }`), so it runs on
 * Cloudflare Workers, Deno or Bun. Configuration comes from the environment:
 *
 * - `ATLI_ENV`: `staging` (the default) or `production`.
 * - `ATLI_API_BASE`: another API address, overriding `ATLI_ENV`.
 * - `ASSETS`: whatever serves the built files from `dist/`. Without it, only
 *   /api is answered.
 *
 * It forwards only the calls the store makes (ALLOWED below), so it can't be
 * used as an open proxy to the rest of the API.
 */

/** Each path the store calls, by method. `*` stands for one path segment, such as an eSIM's id. */
const ALLOWED = [
  ['GET', '/explore/plans'],
  ['GET', '/currencies'],
  ['GET', '/stripe/config'],
  ['POST', '/login'],
  ['POST', '/user/referral/redeem'],
  ['POST', '/plan/quote'],
  ['POST', '/plan/purchase'],
  ['POST', '/plan/fulfill-payment'],
  ['GET', '/fulfillment/status-updates'],
  ['GET', '/esims'],
  ['POST', '/esims/*/sync'],
];

/** Request headers passed on to the API. Anything else, cookies included, stays behind. */
const FORWARDED_HEADERS = ['accept', 'accept-language', 'authorization', 'content-type', 'user-agent', 'x-locale'];

/** Response headers passed back to the browser. */
const RETURNED_HEADERS = [
  'content-type',
  'content-language',
  'retry-after',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
];

/**
 * Whether the store may call `method path` through the proxy.
 *
 * @param {string} method
 * @param {string} path
 */
export function isAllowed(method, path) {
  const segments = path.split('/');
  return ALLOWED.some(([allowedMethod, pattern]) => {
    if (allowedMethod !== method) return false;
    const expected = pattern.split('/');
    return (
      expected.length === segments.length &&
      expected.every((part, i) => (part === '*' ? /^[\w-]+$/.test(segments[i]) : part === segments[i]))
    );
  });
}

/**
 * Forward one /api/… request to Atli's API, and its answer back.
 *
 * @param {Request} request
 * @param {{ ATLI_ENV?: string, ATLI_API_BASE?: string }} env
 * @param {typeof fetch} [send]
 */
export async function proxy(request, env, send = fetch) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!isAllowed(request.method, path)) {
    return Response.json({ code: 'not_found', message: 'Not a call this store makes.' }, { status: 404 });
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Atli rate-limits per caller: say who the caller is, not the proxy.
  const client = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for');
  if (client) headers.set('x-forwarded-for', client);

  const target = `${upstreamFor(env.ATLI_ENV, env.ATLI_API_BASE)}${path}${url.search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let answer;
  try {
    answer = await send(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });
  } catch {
    return Response.json({ code: 'bad_gateway', message: "Couldn't reach Atli's API." }, { status: 502 });
  }

  const returned = new Headers({ 'cache-control': 'no-store' });
  for (const name of RETURNED_HEADERS) {
    const value = answer.headers.get(name);
    if (value) returned.set(name, value);
  }
  return new Response(answer.body, { status: answer.status, headers: returned });
}

export default {
  /**
   * @param {Request} request
   * @param {{ ATLI_ENV?: string, ATLI_API_BASE?: string, ASSETS?: { fetch: typeof fetch } }} env
   */
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return proxy(request, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
