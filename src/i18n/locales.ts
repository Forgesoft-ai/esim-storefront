/**
 * The store's languages: heyatli.com's fifteen, in its picker's order, each
 * named in itself.
 */
export const LANGUAGES = [
  ['en', 'English'],
  ['pt', 'Português'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['it', 'Italiano'],
  ['de', 'Deutsch'],
  ['pl', 'Polski'],
  ['ru', 'Русский'],
  ['zh', '中文'],
  ['ko', '한국어'],
  ['ja', '日本語'],
  ['id', 'Bahasa Indonesia'],
  ['vi', 'Tiếng Việt'],
  ['ms', 'Bahasa Melayu'],
  ['ar', 'العربية'],
] as const;

export type Locale = (typeof LANGUAGES)[number][0];

export const DEFAULT_LOCALE: Locale = 'en';

const LOCALES = new Set<string>(LANGUAGES.map(([code]) => code));

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && LOCALES.has(value);
}

const STORAGE_KEY = 'esim-storefront:locale';

/**
 * The language to show, the way Atli's sites choose it:
 *
 * 1. the language the visitor picked here before;
 * 2. their browser's languages, in order, matched on the primary subtag alone
 *    (`pt-BR` is `pt`, `zh-TW` is `zh`), as each language here has no regional
 *    variants;
 * 3. English.
 */
export function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage may be off in a private window; fall through to the browser's languages.
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const language = tag?.split('-')[0].toLowerCase();
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}

export function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The choice holds for this visit; it just won't be remembered.
  }
}

export const isRtl = (locale: Locale) => locale === 'ar';
