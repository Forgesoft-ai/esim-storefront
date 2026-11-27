import { useEffect, useId, useRef, useState } from 'react';

import type { Plan } from '../api/atli';
import { flagSrc, planSubject } from '../art';
import { formatPrice, planName } from '../catalogue';
import { useI18n } from '../i18n/context';

interface Props {
  plans: Plan[];
  value: Plan;
  onChange: (plan: Plan) => void;
}

type T = ReturnType<typeof useI18n>['t'];
const coverage = (t: T, plan: Plan) =>
  plan.countries.length > 1 ? t('countries', { n: plan.countries.length }) : t('plan.thisCountry');

/** One row: the plan's flag, name, coverage and starting price. */
function PlanRow({ plan }: { plan: Plan }) {
  const { t } = useI18n();
  return (
    <>
      <img className="plan-select__flag" src={flagSrc(planSubject(plan))} alt="" width={28} height={28} />
      <span className="plan-select__text">
        <strong>{planName(plan)}</strong>
        <span>{coverage(t, plan)}</span>
      </span>
      <span className="plan-select__price">
        {t('from', { price: formatPrice(plan.min_price_display, plan.currency) })}
      </span>
    </>
  );
}

/**
 * The plan to buy, as a dropdown: the chosen one on show, the others a click
 * away. Arrow keys move, Enter picks, Escape or a click elsewhere closes.
 */
export function PlanSelect({ plans, value, onChange }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const pick = (plan: Plan) => {
    if (plan.id !== value.id) onChange(plan);
    close();
  };

  return (
    <div ref={root} className="plan-select">
      <button
        ref={button}
        type="button"
        className="plan-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t('plan.aria', { name: planName(value), coverage: coverage(t, value) })}
        onClick={() => {
          setActive(
            Math.max(
              0,
              plans.findIndex((p) => p.id === value.id),
            ),
          );
          setOpen((v) => !v);
        }}
      >
        <PlanRow plan={value} />
        <svg viewBox="0 0 12 12" aria-hidden className={`picker__chevron${open ? ' is-open' : ''}`}>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={t('plans')}
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          className="plan-select__list"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, plans.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              pick(plans[active]);
            } else if (e.key === 'Escape' || e.key === 'Tab') {
              e.preventDefault();
              close();
            }
          }}
        >
          {plans.map((plan, i) => (
            <li
              key={plan.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={plan.id === value.id}
              className={`plan-select__option${i === active ? ' is-active' : ''}${plan.id === value.id ? ' is-selected' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(plan)}
            >
              <PlanRow plan={plan} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
