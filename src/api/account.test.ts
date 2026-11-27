import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDeviceId, secretLink, takeDeviceFromLink } from './account';

const DEVICE = '00000000-0000-4000-8000-000000000000';

function page(href: string) {
  const url = new URL(href);
  const replaceState = vi.fn((_: unknown, __: string, next: string) => {
    const moved = new URL(next, url);
    url.pathname = moved.pathname;
    url.search = moved.search;
    url.hash = moved.hash;
  });
  vi.stubGlobal('window', {
    get location() {
      return { origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash };
    },
    history: { replaceState },
  });
  return { url, replaceState };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isDeviceId', () => {
  it('accepts a UUID and nothing else', () => {
    expect(isDeviceId(DEVICE)).toBe(true);
    expect(isDeviceId('not-a-device')).toBe(false);
    expect(isDeviceId('')).toBe(false);
    expect(isDeviceId(null)).toBe(false);
  });
});

describe('the secret link', () => {
  it('carries the device in the fragment, which browsers never send to a server', () => {
    page('https://map.examples.heyatli.com/?d=jp');
    expect(secretLink(DEVICE)).toBe(`https://map.examples.heyatli.com/#device=${DEVICE}`);
  });

  it('is read once and then removed from the address, keeping the rest of it', () => {
    const { url } = page(`https://map.examples.heyatli.com/?d=jp#device=${DEVICE}`);
    expect(takeDeviceFromLink()).toBe(DEVICE);
    expect(url.hash).toBe('');
    expect(url.search).toBe('?d=jp');
  });

  it('ignores a fragment that is not a device', () => {
    page('https://map.examples.heyatli.com/#device=../../etc');
    expect(takeDeviceFromLink()).toBeNull();
  });

  it('finds nothing when there is no link in the address', () => {
    page('https://map.examples.heyatli.com/');
    expect(takeDeviceFromLink()).toBeNull();
  });
});
