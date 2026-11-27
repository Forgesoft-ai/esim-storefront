import ar from './messages/ar';
import de from './messages/de';
import en, { type Key, type Messages, type Plural } from './messages/en';
import es from './messages/es';
import fr from './messages/fr';
import id from './messages/id';
import it from './messages/it';
import ja from './messages/ja';
import ko from './messages/ko';
import ms from './messages/ms';
import pl from './messages/pl';
import pt from './messages/pt';
import ru from './messages/ru';
import vi from './messages/vi';
import zh from './messages/zh';
import type { Locale } from './locales';

export type { Key };

const MESSAGES: Record<Locale, Messages> = { en, pt, es, fr, it, de, pl, ru, zh, ko, ja, id, vi, ms, ar };

export type Vars = Record<string, string | number>;

/**
 * A message in `locale`, with `{name}` filled from `vars`. A plural message
 * picks its form for `vars.n` by the language's own rules (Polish's "few",
 * Arabic's "two"…), falling back to `other`.
 */
export function translate(locale: Locale, key: Key, vars: Vars = {}): string {
  const message = (MESSAGES[locale] ?? en)[key] ?? en[key];
  let text: string;
  if (typeof message === 'string') {
    text = message;
  } else {
    const plural = message as Plural;
    const form = new Intl.PluralRules(locale).select(Number(vars.n ?? 0));
    text = plural[form] ?? plural.other;
  }
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
