import { createContext, useContext } from 'react';

import type { Package } from '../api/atli';
import { DEFAULT_LOCALE, type Locale } from './locales';
import { type Key, translate, type Vars } from './translate';

export interface I18n {
  locale: Locale;
  t: (key: Key, vars?: Vars) => string;
}

export const I18nContext = createContext<I18n>({
  locale: DEFAULT_LOCALE,
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
});

/** The chosen language and its words, from the nearest I18nProvider. */
export function useI18n(): I18n {
  return useContext(I18nContext);
}

/** "∞ GB" or "5 GB": data needs no translation. */
export function packageData(pkg: Package): string {
  return pkg.is_unlimited ? '∞ GB' : pkg.data_amount;
}

/** "∞ GB · 7 days", with the days in the chosen language. */
export function packageLabel(t: I18n['t'], pkg: Package): string {
  return `${packageData(pkg)} · ${t('days', { n: pkg.validity_days })}`;
}
