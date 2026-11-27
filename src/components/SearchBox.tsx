import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { flagSrc, planSubject } from '../art';
import { type Catalogue, type Destination, planName } from '../catalogue';
import { SearchIcon } from './icons';
import { useI18n } from '../i18n/context';
import { fold, rankMatches } from '../search';

interface Option {
  key: string;
  label: string;
  /** What it is: "Country", "Region", "City · Japan". */
  hint: string;
  /** Its starting price, when it has its own. */
  price?: string;
  flag: string;
  destination: Destination;
  /** Countries first, then regions, then states and cities together, the biggest cities first. */
  rank: number;
  population?: number;
  /** What the query is matched against: names and codes, lower case, without accents. */
  haystack: string;
}

interface Props {
  catalogue: Catalogue;
  onPick: (destination: Destination) => void;
  formatFrom: (amount: number) => string;
}

/** A combobox over every country and every regional or global plan. */
export function SearchBox({ catalogue, onPick, formatFrom }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const compact = useCompact();
  const pulsing = useAttentionPulse();

  const options = useMemo<Option[]>(() => {
    const plans: Option[] = catalogue.multi.map((plan) => ({
      key: `p:${plan.id}`,
      label: planName(plan),
      flag: flagSrc(planSubject(plan)),
      hint: `${t(plan.category === 'global' ? 'kind.worldwide' : 'kind.region')} · ${t('countries', { n: plan.countries.length })}`,
      price: t('from', { price: formatFrom(plan.min_price_display) }),
      rank: 1,
      destination: { kind: 'plan', plan },
      haystack: fold(`${planName(plan)} ${plan.name} ${plan.id.replace(/_/g, ' ')} ${plan.category}`),
    }));
    const countries: Option[] = [...catalogue.countries].map(([code, { name, flag }]) => {
      const own = catalogue.local.get(code);
      return {
        key: `c:${code}`,
        label: name,
        flag: flagSrc({ kind: 'country', code }),
        hint: own ? t('kind.country') : `${t('kind.country')} · ${t('regionalPlans')}`,
        price: own ? t('from', { price: formatFrom(own.min_price_display) }) : undefined,
        rank: 0,
        destination: { kind: 'country', code, name, flag },
        haystack: fold(`${name} ${code}`),
      };
    });
    // A state or city sells its country's plans, so it opens the country, named as the place.
    const places: Option[] = [...catalogue.places.values()].map((place) => {
      const country = catalogue.countries.get(place.country)!;
      const own = catalogue.local.get(place.country);
      return {
        key: `s:${place.slug}`,
        label: place.name,
        flag: flagSrc({ kind: 'country', code: place.country }),
        hint: `${t(place.type === 'city' ? 'kind.city' : 'kind.state')} · ${country.name}`,
        price: own ? t('from', { price: formatFrom(own.min_price_display) }) : undefined,
        rank: 2,
        population: place.population ?? 0,
        destination: { kind: 'country', code: place.country, ...country, place },
        haystack: fold(`${place.name} ${country.name}`),
      };
    });
    return [...countries, ...plans, ...places].sort(
      (a, b) => a.rank - b.rank || (b.population ?? 0) - (a.population ?? 0) || a.label.localeCompare(b.label),
    );
  }, [catalogue, formatFrom, t]);

  const results = useMemo(() => rankMatches(options, query), [options, query]);

  const pick = (option: Option) => {
    onPick(option.destination);
    setQuery('');
    setOpen(false);
    input.current?.blur();
  };

  const showList = open && results.length > 0;

  return (
    <div className={`search${pulsing ? ' is-pulsing' : ''}`}>
      <label htmlFor={`${listId}-input`} className="visually-hidden">
        {t('search.label')}
      </label>
      <SearchIcon className="icon search__icon" width={18} height={18} />
      <input
        ref={input}
        id={`${listId}-input`}
        type="search"
        placeholder={t(compact ? 'search.placeholderShort' : 'search.placeholder')}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          // In the phone sheet, bring the field to the top, so the keyboard doesn't cover the results.
          if (e.currentTarget.closest('.popular'))
            e.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === 'Escape') {
            // The first Escape closes the list; the next clears what was typed.
            if (showList) setOpen(false);
            else setQuery('');
          }
        }}
      />
      {showList ? (
        <ul id={listId} role="listbox" className="search__list">
          {results.map((option, i) => (
            <li
              key={option.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              // Before the input's blur, so the click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <img className="search__flag" src={option.flag} alt="" width={22} height={22} loading="lazy" />
              <span className="search__text">
                <span className="search__label">{option.label}</span>
                <span className="search__hint">{option.hint}</span>
              </span>
              {option.price ? <span className="search__price">{option.price}</span> : null}
            </li>
          ))}
        </ul>
      ) : open && query.trim() ? (
        <p className="search__empty">{t('search.empty', { q: query.trim() })}</p>
      ) : null}
    </div>
  );
}

const PHONE = '(max-width: 720px)';

/** On a phone the field is narrow, so the placeholder is short. */
function useCompact(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(PHONE).matches);
  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const onChange = () => setCompact(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/** The first pulse comes as the page opens, then one every this often while nobody has touched anything. */
const PULSE_EVERY_MS = 7000;
const PULSE_LENGTH_MS = 1600;
const INTERACTIONS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Draws the eye to the search: a pulse as the page opens, and again every few
 * seconds until the visitor does anything at all, after which it stops for
 * good. Nothing pulses for someone who asks for reduced motion.
 */
function useAttentionPulse(): boolean {
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let stopped = false;
    let off: ReturnType<typeof setTimeout>;
    const pulse = () => {
      if (stopped) return;
      setPulsing(true);
      off = setTimeout(() => setPulsing(false), PULSE_LENGTH_MS);
    };
    const first = setTimeout(pulse, 600);
    const every = setInterval(pulse, PULSE_EVERY_MS);
    const stop = () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(every);
      clearTimeout(off);
      setPulsing(false);
      for (const type of INTERACTIONS) window.removeEventListener(type, stop, true);
    };
    for (const type of INTERACTIONS) window.addEventListener(type, stop, { capture: true, passive: true });
    return stop;
  }, []);
  return pulsing;
}
