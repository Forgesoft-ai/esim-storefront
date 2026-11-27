import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiUrl, ENVIRONMENTS } from './config';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiUrl', () => {
  it("calls the store's own /api/<environment> through the proxy by default", () => {
    vi.stubGlobal('window', { location: { origin: 'https://map.example' } });
    expect(apiUrl('/explore/plans?currency=EUR', ENVIRONMENTS.sandbox, false).href).toBe(
      'https://map.example/api/sandbox/explore/plans?currency=EUR',
    );
    expect(apiUrl('/login', ENVIRONMENTS.production, false).href).toBe('https://map.example/api/production/login');
  });

  it("calls the environment's API itself in a direct build", () => {
    vi.stubGlobal('window', { location: { origin: 'https://map.example' } });
    expect(apiUrl('/login', ENVIRONMENTS.sandbox, true).href).toBe('https://api-staging.heyatli.com/login');
    expect(apiUrl('/currencies', ENVIRONMENTS.production, true).href).toBe('https://api.heyatli.com/currencies');
  });
});
