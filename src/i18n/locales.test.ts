import { afterEach, describe, expect, it, vi } from 'vitest';

import { initialLocale, rememberLocale } from './locales';

function browser(languages: string[], stored: Record<string, string> = {}) {
  const store = new Map(Object.entries(stored));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  vi.stubGlobal('window', { localStorage: globalThis.localStorage });
  vi.stubGlobal('navigator', { languages, language: languages[0] });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initialLocale', () => {
  it("follows the browser's languages, by their primary subtag", () => {
    browser(['pt-BR', 'en-US']);
    expect(initialLocale()).toBe('pt');
  });

  it('skips languages the store has none of', () => {
    browser(['nl-NL', 'zh-TW', 'en']);
    expect(initialLocale()).toBe('zh');
  });

  it('falls back to English', () => {
    browser(['nl-NL', 'sv']);
    expect(initialLocale()).toBe('en');
  });

  it("puts the visitor's own pick before the browser's", () => {
    browser(['de-DE']);
    rememberLocale('ja');
    expect(initialLocale()).toBe('ja');
  });

  it('ignores a stored value that is not a language the store has', () => {
    browser(['fr-FR'], { 'esim-storefront:locale': 'xx' });
    expect(initialLocale()).toBe('fr');
  });
});
