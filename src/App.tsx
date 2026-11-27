import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchDestinations, type SiteDestination } from './api/site';
import { AtliError, type Currency, fetchCurrencies, fetchPlans, type Package, type Plan } from './api/atli';
import { adoptDevice, storedDevice, takeDeviceFromLink } from './api/account';
import { ENV, IS_SANDBOX, switchEnvironment } from './config';
import { CheckoutDialog } from './components/CheckoutDialog';
import { returningOrder } from './returningOrder';
import { SimIcon } from './components/icons';
import { MyEsims } from './components/MyEsims';
import { CurrencyPicker } from './components/CurrencyPicker';
import { EnvironmentSwitch } from './components/EnvironmentSwitch';
import { LanguagePicker } from './components/LanguagePicker';
import { I18nProvider } from './i18n/I18n';
import { initialLocale, isRtl, type Locale, rememberLocale } from './i18n/locales';
import { translate } from './i18n/translate';
import {
  buildCatalogue,
  type Catalogue,
  defaultPackage,
  type Destination,
  formatPrice,
  plansFor,
  setNumberLocale,
} from './catalogue';
import { PlanPanel } from './components/PlanPanel';
import { Popular } from './components/Popular';
import { SandboxTag } from './components/SandboxTag';
import { SearchBox } from './components/SearchBox';
import { ThemeToggle } from './components/ThemeToggle';
import { countryName } from './map/geography';
import { heatScale, lowestPrices } from './map/heat';
import { HeatLegend } from './map/HeatLegend';
import { type Coverage, WorldMap } from './map/WorldMap';

const CURRENCY_KEY = 'esim-storefront:currency';
const OPEN_ESIMS_KEY = 'esim-storefront:open-esims';
const HEAT_KEY = 'esim-storefront:heatmap';

function readHeat(): boolean {
  try {
    return localStorage.getItem(HEAT_KEY) === 'on';
  } catch {
    return false;
  }
}

function rememberHeat(on: boolean) {
  try {
    localStorage.setItem(HEAT_KEY, on ? 'on' : 'off');
  } catch {
    // The heatmap holds for this visit.
  }
}

/** Carry "open My eSIMs" across the reload a secret link from the other environment causes. */
function rememberEsimsOpen() {
  try {
    sessionStorage.setItem(OPEN_ESIMS_KEY, '1');
  } catch {
    // The eSIMs are a click away under My eSIMs.
  }
}

function takeEsimsOpen(): boolean {
  try {
    const open = sessionStorage.getItem(OPEN_ESIMS_KEY) === '1';
    sessionStorage.removeItem(OPEN_ESIMS_KEY);
    return open;
  } catch {
    return false;
  }
}
/** The plan panel's width and its margin, from styles.css (.panel). */
const PANEL_INSET = 420 + 32;
const WIDE = '(min-width: 721px)';

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const onChange = () => setWide(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return wide;
}

/** What's selected lives in the address, so a pick survives a reload and can be shared. */
function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return { dest: params.get('d'), plan: params.get('plan'), pkg: params.get('pkg') };
}

function writeUrl(dest: string | null, plan: string | null, pkg: string | null) {
  const params = new URLSearchParams(window.location.search);
  const entries: [string, string | null][] = [
    ['d', dest],
    ['plan', plan],
    ['pkg', pkg],
  ];
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

/** `jp` is a country, `place:tokyo` a state or city, and `plan:europe` a regional or global plan. */
function destinationKey(destination: Destination): string {
  if (destination.kind === 'plan') return `plan:${destination.plan.id}`;
  return destination.place ? `place:${destination.place.slug}` : destination.code;
}

function resolveDestination(catalogue: Catalogue, key: string | null): Destination | null {
  if (!key) return null;
  if (key.startsWith('plan:')) {
    const plan = catalogue.multi.find((p) => p.id === key.slice(5));
    return plan ? { kind: 'plan', plan } : null;
  }
  if (key.startsWith('place:')) {
    const place = catalogue.places.get(key.slice(6));
    const country = place && catalogue.countries.get(place.country);
    return place && country ? { kind: 'country', code: place.country, ...country, place } : null;
  }
  const country = catalogue.countries.get(key);
  return country ? { kind: 'country', code: key, ...country } : null;
}

function readCurrency() {
  try {
    return localStorage.getItem(CURRENCY_KEY) ?? 'USD';
  } catch {
    return 'USD';
  }
}

export default function App() {
  const [currency, setCurrency] = useState(readCurrency);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  // For callbacks that outlive a render, such as the secret-link check.
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const t = useCallback(
    (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate(locale, key, vars),
    [locale],
  );
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState<AtliError | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [planId, setPlanId] = useState('');
  const [selected, setSelected] = useState<Package | null>(null);
  const [destinations, setDestinations] = useState<SiteDestination[] | null>(null);
  /** Paying for the selected package, or picking up an order a payment redirect came back for. */
  const [checkout, setCheckout] = useState<{ resumeOrder?: string } | null>(() => {
    const order = returningOrder();
    return order ? { resumeOrder: order } : null;
  });
  const [hasDevice, setHasDevice] = useState(() => !!storedDevice());
  const [showEsims, setShowEsims] = useState(takeEsimsOpen);

  // A secret link (#device=…) brings a device's eSIMs to this browser: on
  // arrival, or pasted into the address bar of an open store, which only
  // changes the fragment.
  useEffect(() => {
    const restore = () => {
      const linked = takeDeviceFromLink();
      if (!linked) return;
      const current = storedDevice(linked.environment);
      if (current && current !== linked.id) {
        const replace = window.confirm(translate(localeRef.current, 'app.switchDevice'));
        if (!replace) return;
      }
      adoptDevice(linked.id, linked.environment);
      // A link from the other environment switches to it, and opens its eSIMs there.
      if (linked.environment !== ENV.name) {
        rememberEsimsOpen();
        switchEnvironment(linked.environment);
        return;
      }
      setHasDevice(true);
      setShowEsims(true);
    };
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, []);

  useEffect(() => {
    fetchCurrencies().then(setCurrencies, () => setCurrencies([]));
  }, []);

  // A stored currency that's no longer offered falls back to USD, as on heyatli.com.
  useEffect(() => {
    if (currencies.length && !currencies.some((c) => c.code === currency)) setCurrency('USD');
  }, [currencies, currency]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    setNumberLocale(locale);
    let cancelled = false;
    // States and cities are a nicety: without them the store still sells every plan.
    fetchDestinations(locale).then(
      (list) => !cancelled && setDestinations(list),
      () => !cancelled && setDestinations([]),
    );
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // The catalogue is priced in one currency, so a new currency loads it again.
  useEffect(() => {
    if (!destinations) return;
    let cancelled = false;
    setError(null);
    fetchPlans(currency, locale).then(
      (plans) => {
        if (cancelled) return;
        const next = buildCatalogue(plans, countryName, destinations);
        setCatalogue(next);
        // First load: restore what the address names. Later loads: keep the pick, repriced.
        const url = readUrl();
        setDestination((current) => resolveDestination(next, current ? destinationKey(current) : url.dest));
        setPlanId((current) => current || url.plan || '');
        setSelected((current) => {
          const id = current?.id ?? url.pkg;
          const kept = id ? next.plans.flatMap((p) => p.packages).find((p) => p.id === id) : undefined;
          if (kept) return kept;
          // A link to a destination with no package opens on its default one, as a click does.
          const opened = resolveDestination(next, url.dest);
          if (!opened || current) return null;
          const plans = opened.kind === 'plan' ? [opened.plan] : plansFor(next, opened.code);
          const plan = plans.find((p) => p.id === url.plan) ?? plans[0];
          return plan ? defaultPackage(plan) : null;
        });
      },
      (e: unknown) => {
        if (!cancelled) setError(e instanceof AtliError ? e : new AtliError(0, 'unknown', String(e)));
      },
    );
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch {
      // Private windows may refuse storage; the choice just won't be remembered.
    }
    return () => {
      cancelled = true;
    };
    // `locale` reaches the request through `destinations`, which reloads with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, destinations]);

  const plans: Plan[] = useMemo(() => {
    if (!catalogue || !destination) return [];
    return destination.kind === 'country' ? plansFor(catalogue, destination.code) : [destination.plan];
  }, [catalogue, destination]);

  const activePlan = plans.find((p) => p.id === planId) ?? plans[0];

  useEffect(() => {
    if (!catalogue) return;
    writeUrl(
      destination ? destinationKey(destination) : null,
      activePlan && plans.length > 1 ? activePlan.id : null,
      selected?.id ?? null,
    );
  }, [catalogue, destination, activePlan, plans.length, selected]);

  // Opening a destination starts on its first plan's default package, so Pay is one click away.
  const choose = useCallback(
    (next: Destination | null) => {
      setDestination(next);
      setPlanId('');
      const first =
        !next || !catalogue ? undefined : next.kind === 'plan' ? next.plan : plansFor(catalogue, next.code)[0];
      setSelected(first ? defaultPackage(first) : null);
    },
    [catalogue],
  );

  // The price heatmap: each country by the lowest price covering it, on or off by the visitor's choice.
  const [heatOn, setHeatOn] = useState(readHeat);
  const heat = useMemo(() => (catalogue ? heatScale(lowestPrices(catalogue)) : null), [catalogue]);
  const toggleHeat = useCallback(() => {
    setHeatOn((on) => {
      rememberHeat(!on);
      return !on;
    });
  }, []);

  const coverage = useCallback(
    (code: string): Coverage => {
      if (!catalogue) return 'none';
      if (catalogue.local.has(code)) return 'own';
      return catalogue.countries.has(code) ? 'covered' : 'none';
    },
    [catalogue],
  );

  // Every country the chosen plan covers, so picking Asia for Japan shows all of Asia.
  const highlighted = useMemo<ReadonlySet<string>>(() => {
    if (!destination) return new Set();
    if (destination.kind === 'plan') return new Set(destination.plan.countries);
    return new Set(activePlan && activePlan.countries.length > 1 ? activePlan.countries : [destination.code]);
  }, [destination, activePlan]);

  // On a wide screen the plan panel covers the map's end edge: keep what's picked clear of it.
  const wide = useWide();

  const label = useCallback(
    (code: string) => {
      const known = catalogue?.countries.get(code);
      if (!known) return code.length === 2 ? t('map.notSold', { name: countryName(code) ?? code.toUpperCase() }) : code;
      const own = catalogue?.local.get(code);
      const price = own ? t('from', { price: formatPrice(own.min_price_display, own.currency) }) : t('regionalPlans');
      return `${known.flag} ${known.name} · ${price}`;
    },
    [catalogue, t],
  );

  const selectCountry = useCallback(
    (code: string) => {
      const known = catalogue?.countries.get(code);
      if (known) choose({ kind: 'country', code, ...known });
    },
    [catalogue, choose],
  );

  const markPurchased = useCallback(() => setHasDevice(true), []);

  // A new language rewrites prices in its own format, so it makes a new formatter.
  const formatFrom = useMemo(() => {
    void locale;
    return (amount: number) => formatPrice(amount, currency);
  }, [currency, locale]);

  return (
    <I18nProvider locale={locale}>
      <div className="app">
        <header className="topbar">
          <EnvironmentSwitch />
          {catalogue ? (
            <SearchBox catalogue={catalogue} onPick={choose} formatFrom={formatFrom} />
          ) : (
            <div className="search search--loading" />
          )}
          <div className="pickers">
            {hasDevice ? (
              <button
                type="button"
                className="picker__trigger"
                aria-label={t('myEsims')}
                onClick={() => setShowEsims(true)}
              >
                <SimIcon /> <span className="label-wide">{t('myEsims')}</span>
              </button>
            ) : null}
            <LanguagePicker
              locale={locale}
              onChange={(next) => {
                rememberLocale(next);
                setLocale(next);
              }}
            />
            <CurrencyPicker currency={currency} currencies={currencies} locale={locale} onChange={setCurrency} />
            <ThemeToggle />
          </div>
        </header>

        <main className={`stage${destination ? ' has-panel' : ''}`}>
          {error ? (
            <div className="notice notice--error" role="alert">
              <strong>{t('app.loadError')}</strong> {error.message} <code>{error.code}</code>
              {error.traceId ? <code>trace {error.traceId}</code> : null}
            </div>
          ) : !catalogue ? (
            <div className="notice" role="status">
              {t('app.loading')}
            </div>
          ) : null}

          <WorldMap
            coverage={coverage}
            highlighted={highlighted}
            focused={destination?.kind === 'country' ? destination.code : undefined}
            focusKey={destination ? `${destinationKey(destination)}|${activePlan?.id ?? ''}` : ''}
            insetEnd={destination && wide ? PANEL_INSET : 0}
            label={label}
            onSelect={selectCountry}
            heat={heatOn ? heat?.color : undefined}
            onToggleHeat={heat ? toggleHeat : undefined}
            heatLegend={
              heat ? (
                <HeatLegend
                  title={t('map.lowestPrice')}
                  min={formatPrice(heat.min, currency)}
                  max={formatPrice(heat.max, currency)}
                  cheaper={t('map.cheaper')}
                  dearer={t('map.dearer')}
                />
              ) : null
            }
          />

          {catalogue && destination ? (
            <PlanPanel
              key={destinationKey(destination)}
              catalogue={catalogue}
              destination={destination}
              plans={plans}
              planId={activePlan?.id ?? ''}
              onPlan={setPlanId}
              selected={selected}
              onSelect={setSelected}
              onClose={() => choose(null)}
              onPay={() => setCheckout({})}
            />
          ) : catalogue ? (
            <Popular
              catalogue={catalogue}
              onPick={choose}
              // On a phone the search sits here, on top of the sheet, rather than in the crowded header.
              search={<SearchBox catalogue={catalogue} onPick={choose} formatFrom={formatFrom} />}
            />
          ) : null}
          {IS_SANDBOX ? <SandboxTag /> : null}
        </main>

        {checkout ? (
          <CheckoutDialog
            plan={checkout.resumeOrder ? undefined : activePlan}
            pkg={checkout.resumeOrder ? undefined : (selected ?? undefined)}
            currency={currency}
            locale={locale}
            resumeOrder={checkout.resumeOrder}
            onClose={() => setCheckout(null)}
            onPurchased={markPurchased}
          />
        ) : null}

        {showEsims ? <MyEsims catalogue={catalogue} locale={locale} onClose={() => setShowEsims(false)} /> : null}
      </div>
    </I18nProvider>
  );
}
