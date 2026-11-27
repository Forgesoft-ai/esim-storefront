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

describe('the environment for a page', () => {
  async function load(env: Record<string, string>, stored?: string) {
    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'esim-storefront:environment' ? (stored ?? null) : null),
      setItem: () => {},
    });
    return import('./config');
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is Production by default, or Sandbox when the build says so', async () => {
    expect((await load({})).ENV.name).toBe('production');
    expect((await load({ VITE_ATLI_ENV: 'sandbox' })).ENV.name).toBe('sandbox');
  });

  it("follows the visitor's choice while the switch is on", async () => {
    const config = await load({}, 'sandbox');
    expect(config.CAN_SWITCH_ENVIRONMENT).toBe(true);
    expect(config.ENV.name).toBe('sandbox');
  });

  it('stays on the default, whatever was chosen, when the build turns the switch off', async () => {
    const config = await load({ VITE_ATLI_ENV_SWITCH: 'off' }, 'sandbox');
    expect(config.CAN_SWITCH_ENVIRONMENT).toBe(false);
    expect(config.ENV.name).toBe('production');
  });
});
