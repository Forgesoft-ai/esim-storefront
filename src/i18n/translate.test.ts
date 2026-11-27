import { describe, expect, it } from 'vitest';

import { LANGUAGES, type Locale } from './locales';
import en, { type Key } from './messages/en';
import { translate } from './translate';

const LOCALES = LANGUAGES.map(([code]) => code) as Locale[];
const KEYS = Object.keys(en) as Key[];

/** The `{name}` placeholders in a message, or in every form of a plural. */
function placeholders(locale: Locale, key: Key): string[] {
  const forms = [translate(locale, key, { n: 1 }), translate(locale, key, { n: 2 }), translate(locale, key, { n: 5 })];
  return [...new Set(forms.flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort();
}

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'from', { price: '$4.99' })).toBe('from $4.99');
    expect(translate('de', 'checkout.payAmount', { amount: '15,30 €' })).toBe('15,30 € bezahlen');
  });

  it('leaves a placeholder it has no value for, rather than printing "undefined"', () => {
    expect(translate('en', 'search.empty')).toBe('No destination matches “{q}”.');
  });

  it("picks each language's own plural form", () => {
    expect(translate('en', 'days', { n: 1 })).toBe('1 day');
    expect(translate('en', 'days', { n: 7 })).toBe('7 days');
    expect(translate('ru', 'days', { n: 1 })).toBe('1 день');
    expect(translate('ru', 'days', { n: 3 })).toBe('3 дня');
    expect(translate('ru', 'days', { n: 5 })).toBe('5 дней');
    expect(translate('pl', 'countries', { n: 22 })).toBe('22 kraje');
    expect(translate('pl', 'countries', { n: 25 })).toBe('25 krajów');
    expect(translate('ar', 'days', { n: 2 })).toBe('يومان');
    expect(translate('ja', 'days', { n: 7 })).toBe('7日間');
  });

  it.each(LOCALES)('%s has every message, with the same placeholders as English', (locale) => {
    // `{n}` aside: a plural may spell out "one" or "two" in words, as Arabic does.
    const named = (l: Locale, key: Key) => placeholders(l, key).filter((name) => name !== 'n');
    for (const key of KEYS) {
      expect(translate(locale, key, { n: 2 }), `${locale} ${key}`).not.toBe('');
      expect(named(locale, key), `${locale} ${key}`).toEqual(named('en', key));
    }
  });
});
