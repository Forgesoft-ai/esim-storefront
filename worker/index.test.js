import { describe, expect, it, vi } from 'vitest';

import worker, { isAllowed, proxy } from './index.js';
import { upstreamFor } from './upstream.js';

/** A stand-in for Atli's API: records what it was sent, and answers `answer`. */
function api(answer = Response.json({ ok: true })) {
  return vi.fn(async () => answer);
}

describe('isAllowed', () => {
  it('lets through the calls the store makes', () => {
    expect(isAllowed('GET', '/explore/plans')).toBe(true);
    expect(isAllowed('POST', '/login')).toBe(true);
    expect(isAllowed('POST', '/esims/2f6a1c3e-0d4b-4f6e-9a7b-1c2d3e4f5a6b/sync')).toBe(true);
  });

  it('refuses anything else, so it is no open proxy', () => {
    expect(isAllowed('DELETE', '/esims')).toBe(false);
    expect(isAllowed('GET', '/login')).toBe(false);
    expect(isAllowed('POST', '/user/api-keys')).toBe(false);
    expect(isAllowed('POST', '/esims/../user/api-keys/sync')).toBe(false);
    expect(isAllowed('GET', '/explore/plans/extra')).toBe(false);
  });
});

describe('proxy', () => {
  it('forwards an allowed call to the environment’s API, query included', async () => {
    const send = api();
    await proxy(new Request('https://map.example/api/sandbox/explore/plans?currency=EUR'), {}, send);
    expect(send).toHaveBeenCalledWith(
      'https://api-staging.heyatli.com/explore/plans?currency=EUR',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('goes to the environment in the path, or to an override for it', async () => {
    const send = api();
    await proxy(new Request('https://map.example/api/production/currencies'), {}, send);
    expect(send.mock.calls[0][0]).toBe('https://api.heyatli.com/currencies');
    await proxy(
      new Request('https://map.example/api/sandbox/currencies'),
      { ATLI_SANDBOX_API: 'http://localhost:8080/' },
      send,
    );
    expect(send.mock.calls[1][0]).toBe('http://localhost:8080/currencies');
  });

  it('answers 404 for an environment it does not know', async () => {
    const send = api();
    const answer = await proxy(new Request('https://map.example/api/qa/currencies'), {}, send);
    expect(answer.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it('passes the body and the headers the API needs, and nothing else', async () => {
    const send = api();
    const request = new Request('https://map.example/api/sandbox/plan/quote', {
      method: 'POST',
      body: '{"product_id":"p"}',
      headers: {
        authorization: 'Bearer t',
        'content-type': 'application/json',
        'x-locale': 'ja',
        cookie: 'session=secret',
        origin: 'https://map.example',
        'cf-connecting-ip': '203.0.113.7',
      },
    });
    await proxy(request, {}, send);
    const [, init] = send.mock.calls[0];
    expect(new TextDecoder().decode(init.body)).toBe('{"product_id":"p"}');
    expect(init.headers.get('authorization')).toBe('Bearer t');
    expect(init.headers.get('x-locale')).toBe('ja');
    expect(init.headers.get('x-forwarded-for')).toBe('203.0.113.7');
    expect(init.headers.get('cookie')).toBeNull();
    expect(init.headers.get('origin')).toBeNull();
  });

  it('returns the API’s answer and status, with its rate-limit headers', async () => {
    const send = api(
      Response.json(
        { code: 'rate_limit_exceeded' },
        { status: 429, headers: { 'retry-after': '30', 'set-cookie': 'x=y' } },
      ),
    );
    const answer = await proxy(
      new Request('https://map.example/api/sandbox/login', { method: 'POST', body: '{}' }),
      {},
      send,
    );
    expect(answer.status).toBe(429);
    expect(answer.headers.get('retry-after')).toBe('30');
    expect(answer.headers.get('set-cookie')).toBeNull();
    expect(await answer.json()).toEqual({ code: 'rate_limit_exceeded' });
  });

  it('answers 404 without calling the API for a call the store does not make', async () => {
    const send = api();
    const answer = await proxy(new Request('https://map.example/api/sandbox/user/profile'), {}, send);
    expect(answer.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it('answers 502 when the API cannot be reached', async () => {
    const send = vi.fn(async () => {
      throw new TypeError('network');
    });
    const answer = await proxy(new Request('https://map.example/api/sandbox/currencies'), {}, send);
    expect(answer.status).toBe(502);
  });
});

describe('the worker', () => {
  it('serves everything outside /api from the built files', async () => {
    const assets = { fetch: vi.fn(async () => new Response('<!doctype html>')) };
    const answer = await worker.fetch(new Request('https://map.example/?d=jp'), { ASSETS: assets });
    expect(await answer.text()).toBe('<!doctype html>');
    expect(assets.fetch).toHaveBeenCalled();
  });
});

describe('upstreamFor', () => {
  it("is each environment's API, unless overridden", () => {
    expect(upstreamFor('sandbox')).toBe('https://api-staging.heyatli.com');
    expect(upstreamFor('production')).toBe('https://api.heyatli.com');
    expect(upstreamFor('production', { ATLI_SANDBOX_API: 'http://x' })).toBe('https://api.heyatli.com');
  });
});
