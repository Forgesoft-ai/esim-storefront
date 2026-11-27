import { useMemo, useState } from 'react';

import type { Package, Plan } from '../api/atli';
import { type ArtSubject, bannerSources, FALLBACK_ART, flagSrc, planSubject } from '../art';
import { CloseIcon, LockIcon } from './icons';
import { PlanSelect } from './PlanSelect';
import { type Catalogue, defaultPackage, type Destination, formatPrice, planName, sortPackages } from '../catalogue';
import { packageData, packageLabel, useI18n } from '../i18n/context';

interface Props {
  catalogue: Catalogue;
  destination: Destination;
  plans: Plan[];
  planId: string;
  onPlan: (planId: string) => void;
  selected: Package | null;
  onSelect: (pkg: Package | null) => void;
  onClose: () => void;
  onPay: () => void;
}

/** Packages come in two kinds: unlimited data for a number of days, or an amount of data. */
type Kind = 'unlimited' | 'standard';
const kindOf = (pkg: Package): Kind => (pkg.is_unlimited ? 'unlimited' : 'standard');

/** The plans for what was picked on the map or in the search, and their packages to choose from. */
export function PlanPanel({
  catalogue,
  destination,
  plans,
  planId,
  onPlan,
  selected,
  onSelect,
  onClose,
  onPay,
}: Props) {
  const { t } = useI18n();
  const [chosenKind, setKind] = useState<Kind | null>(null);

  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  const kinds = useMemo(() => new Set((plan?.packages ?? []).map(kindOf)), [plan]);
  // The visitor's pick when this plan has it; else the selected package's kind; else unlimited, as Atli lists them first.
  const kind: Kind =
    chosenKind && kinds.has(chosenKind)
      ? chosenKind
      : selected && plan?.packages.some((p) => p.id === selected.id)
        ? kindOf(selected)
        : kinds.has('unlimited')
          ? 'unlimited'
          : 'standard';
  const packages = useMemo(
    () => (plan ? sortPackages(plan.packages).filter((p) => kindOf(p) === kind) : []),
    [plan, kind],
  );

  const place = destination.kind === 'country' ? destination.place : undefined;
  const title = place?.name ?? (destination.kind === 'country' ? destination.name : planName(destination.plan));
  const subject: ArtSubject =
    destination.kind === 'country' ? { kind: 'country', code: destination.code } : planSubject(destination.plan);
  // A region's panel is its own plan, so "1 plan covers it" says nothing there.
  const count =
    destination.kind === 'plan'
      ? t('countries', { n: destination.plan.countries.length })
      : t('panel.plansCover', { n: plans.length });
  const sub =
    place && destination.kind === 'country'
      ? `${t(place.type === 'city' ? 'panel.cityIn' : 'panel.stateIn', { country: destination.name })} · ${count}`
      : count;

  return (
    <section className="panel" aria-labelledby="panel-title">
      {/* Outside the header and sticky, so it's still there once the list is scrolled. */}
      <div className="panel__close">
        <button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}>
          <CloseIcon />
        </button>
      </div>
      <header className="panel__header">
        <Banner subject={subject} />
        <img className="panel__flag" src={flagSrc(subject)} alt="" width={48} height={48} />
        <div className="panel__heading">
          <h2 id="panel-title">{title}</h2>
          <p className="panel__sub">{sub}</p>
        </div>
      </header>

      {plans.length > 1 ? (
        <div className="step">
          <h3 className="step__title">
            <span className="step__number">1</span> {t('step.plan')}
          </h3>
          {plan ? (
            <PlanSelect
              plans={plans}
              value={plan}
              onChange={(p) => {
                onPlan(p.id);
                onSelect(defaultPackage(p));
              }}
            />
          ) : null}
        </div>
      ) : null}

      {plan ? (
        <div className="step">
          <PlanFacts key={plan.id} plan={plan} catalogue={catalogue} />

          <h3 className="step__title">
            {plans.length > 1 ? <span className="step__number">2</span> : null} {t('step.package')}
          </h3>
          {kinds.size > 1 ? (
            <div className="segmented" role="tablist" aria-label={t('packageType')}>
              {(['unlimited', 'standard'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  className={kind === k ? 'is-active' : undefined}
                  onClick={() => setKind(k)}
                >
                  {t(k === 'unlimited' ? 'kind.unlimited' : 'kind.standard')}
                </button>
              ))}
            </div>
          ) : null}

          {packages.length ? (
            <ul className="options" role="radiogroup" aria-label={t('packagesOf', { plan: planName(plan) })}>
              {packages.map((pkg) => {
                const checked = selected?.id === pkg.id;
                return (
                  <li key={pkg.id}>
                    <label className={`option${checked ? ' is-selected' : ''}`}>
                      <input type="radio" name="package" checked={checked} onChange={() => onSelect(pkg)} />
                      <span className="option__main">{packageData(pkg)}</span>
                      <span className="option__sub">{t('days', { n: pkg.validity_days })}</span>
                      <span className="option__price">{formatPrice(pkg.price_display, pkg.currency)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="panel__empty">{t('noPackages')}</p>
          )}
        </div>
      ) : null}
      {selected && plan && plan.packages.some((p) => p.id === selected.id) ? (
        <div className="panel__checkout" aria-live="polite">
          <div className="panel__checkout-what">
            <strong>{packageLabel(t, selected)}</strong>
            <span>{planName(plan)}</span>
          </div>
          <span className="panel__checkout-price">{formatPrice(selected.price_display, selected.currency)}</span>
          <button type="button" className="primary" onClick={onPay}>
            <LockIcon /> {t('pay')}
          </button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * What the chosen plan is, in one quiet line: speed, networks and coverage,
 * with the long lists a click away. It supports the choice; it isn't one.
 */
function PlanFacts({ plan, catalogue }: { plan: Plan; catalogue: Catalogue }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<'countries' | 'networks' | null>(null);
  const covered = plan.countries
    .flatMap((code) => {
      const country = catalogue.countries.get(code);
      return country ? [{ code, ...country }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const networks = [...plan.carrier_networks].sort((a, b) => a.localeCompare(b));
  const fewNetworks = networks.length <= 3;
  const toggle = (which: 'countries' | 'networks') => setOpen((current) => (current === which ? null : which));

  return (
    <div className="facts">
      <p className="facts__line">
        {plan.network_types.length ? <span>{plan.network_types.join(' · ')}</span> : null}
        {networks.length ? (
          fewNetworks ? (
            <span>{networks.join(', ')}</span>
          ) : (
            <button
              type="button"
              className="facts__toggle"
              aria-expanded={open === 'networks'}
              onClick={() => toggle('networks')}
            >
              {t('networks', { n: networks.length })}
            </button>
          )
        ) : null}
        {covered.length > 1 ? (
          <button
            type="button"
            className="facts__toggle"
            aria-expanded={open === 'countries'}
            onClick={() => toggle('countries')}
          >
            {t('countries', { n: covered.length })}
          </button>
        ) : null}
      </p>

      {open === 'countries' ? (
        <ul className="country-grid">
          {covered.map((c) => (
            <li key={c.code}>
              <img src={flagSrc({ kind: 'country', code: c.code })} alt="" width={14} height={14} loading="lazy" />
              {c.name}
            </li>
          ))}
        </ul>
      ) : null}
      {open === 'networks' ? <p className="network-list">{networks.join(' · ')}</p> : null}
    </div>
  );
}

/** The destination's art across the top of the panel. It's decoration, so it has no alt text. */
function Banner({ subject }: { subject: ArtSubject }) {
  const { src, srcSet } = bannerSources(subject);
  return (
    <div className="panel__banner" aria-hidden>
      <img
        src={src}
        srcSet={srcSet}
        sizes="420px"
        alt=""
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src === FALLBACK_ART) return;
          img.srcset = '';
          img.src = FALLBACK_ART;
        }}
      />
    </div>
  );
}
