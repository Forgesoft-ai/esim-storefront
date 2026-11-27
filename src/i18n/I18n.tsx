import { type ReactNode, useMemo } from 'react';

import { type I18n, I18nContext } from './context';
import type { Locale } from './locales';
import { translate } from './translate';

/** Gives every component below it the chosen language's words. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18n>(() => ({ locale, t: (key, vars) => translate(locale, key, vars) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
