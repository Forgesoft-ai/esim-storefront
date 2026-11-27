import type { ReactNode } from 'react';

import { flagSrc } from '../art';
import { type Catalogue, type Destination, formatPrice, planName } from '../catalogue';
import { useI18n } from '../i18n/context';

/** The regions offered as quick picks, in this order, when the catalogue has them. */
const REGIONS = ['europe', 'asia', 'global'];

/**
 * Quick picks under the map on a phone, where the map is small and the
 * screen below it would otherwise be empty: the main regions, then the
 * countries Atli marks as popular, cheapest first.
 */
export function Popular({
  catalogue,
  onPick,
  search,
}: {
  catalogue: Catalogue;
  onPick: (destination: Destination) => void;
  search?: ReactNode;
}) {
  const { t } = useI18n();
  const regions = REGIONS.flatMap((id) => catalogue.multi.filter((plan) => plan.id === id));
  const countries = [...catalogue.local]
    .filter(([, plan]) => plan.is_popular)
    .map(([code, plan]) => ({ code, plan, ...catalogue.countries.get(code)! }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="popular" aria-labelledby="popular-title">
      {search}
      <div className="popular__regions">
        {regions.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className="popular__region"
            onClick={() => onPick({ kind: 'plan', plan })}
          >
            <img src={flagSrc({ kind: 'region', id: plan.id })} alt="" width={20} height={20} />
            {planName(plan)}
          </button>
        ))}
      </div>
      <h2 id="popular-title" className="popular__title">
        {t('popular.title')}
      </h2>
      <ul className="popular__list">
        {countries.map(({ code, name, flag, plan }) => (
          <li key={code}>
            <button type="button" onClick={() => onPick({ kind: 'country', code, name, flag })}>
              <img src={flagSrc({ kind: 'country', code })} alt="" width={24} height={24} loading="lazy" />
              <span className="popular__name">{name}</span>
              <span className="popular__price">
                {t('from', { price: formatPrice(plan.min_price_display, plan.currency) })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
