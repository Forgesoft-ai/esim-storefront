import { useCallback, useEffect, useState } from 'react';

import { deviceId, type Esim, type EsimPlan, listEsims, syncEsim } from '../api/account';
import { AtliError } from '../api/atli';
import { flagSrc, planSubject } from '../art';
import { type Catalogue, planName, planOfPackage } from '../catalogue';
import { packageLabel, useI18n } from '../i18n/context';
import { QrIcon, RefreshIcon, SimIcon } from './icons';
import { InstallDetails } from './InstallDetails';
import { Modal } from './Modal';
import { SecretLink } from './SecretLink';

/**
 * This device's eSIMs: each one's plans and data left, how to install it, and
 * the secret link that brings them all to another browser.
 */
export function MyEsims({
  catalogue,
  locale,
  onClose,
}: {
  catalogue: Catalogue | null;
  locale: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [esims, setEsims] = useState<Esim[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEsims(await listEsims(locale));
      setError('');
    } catch (e) {
      setError(e instanceof AtliError ? e.message : t('esims.loadError'));
    }
  }, [locale, t]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async (id: string) => {
    setSyncing(id);
    try {
      await syncEsim(id);
    } catch {
      // Throttled or unreachable: the last figures stay.
    }
    await load();
    setSyncing(null);
  };

  return (
    <Modal title={t('myEsims')} onClose={onClose}>
      {error ? (
        <p className="pay__error" role="alert">
          {error}
        </p>
      ) : null}
      {!esims && !error ? (
        <div className="checkout-state" role="status">
          <span className="spinner" aria-hidden />
          {t('esims.loading')}
        </div>
      ) : null}
      {esims && !esims.length ? (
        <div className="empty">
          <SimIcon width={28} height={28} />
          <strong>{t('esims.emptyTitle')}</strong>
          <span className="muted">{t('esims.emptyBody')}</span>
        </div>
      ) : null}
      {esims?.length ? (
        <ul className="esims">
          {esims.map((esim) => {
            const first = esim.plans?.[0];
            const plan = first && catalogue ? planOfPackage(catalogue, String(first.product_id ?? '')) : undefined;
            const state = esimState(t, esim);
            return (
              <li key={esim.id} className="esim">
                <header className="esim__header">
                  {plan ? (
                    <img className="esim__flag" src={flagSrc(planSubject(plan))} alt="" width={40} height={40} />
                  ) : (
                    <span className="esim__flag esim__flag--blank">
                      <SimIcon width={20} height={20} />
                    </span>
                  )}
                  <div className="esim__title">
                    <h3>{esim.name || destinations(esim, catalogue) || 'eSIM'}</h3>
                    <p className="muted">ICCID ···{esim.iccid.slice(-6)}</p>
                  </div>
                  <span className={`pill pill--${state.tone}`}>{state.label}</span>
                </header>
                {esim.plans?.length ? (
                  <ul className="esim__plans">
                    {esim.plans.map((p) => {
                      const of = catalogue ? planOfPackage(catalogue, String(p.product_id ?? '')) : undefined;
                      const pkg = of?.packages.find((k) => k.id === p.product_id);
                      return (
                        <PlanUsage
                          key={p.id}
                          plan={p}
                          name={of ? planName(of) : p.product_name}
                          detail={pkg ? packageLabel(t, pkg) : p.title}
                          flag={of ? flagSrc(planSubject(of)) : undefined}
                        />
                      );
                    })}
                  </ul>
                ) : null}
                <div className="esim__actions">
                  <button
                    type="button"
                    className="secondary"
                    aria-expanded={open === esim.id}
                    onClick={() => setOpen((current) => (current === esim.id ? null : esim.id))}
                  >
                    <QrIcon /> {t(open === esim.id ? 'esims.hideInstall' : 'esims.install')}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => refresh(esim.id)}
                    disabled={syncing === esim.id}
                  >
                    <RefreshIcon className={syncing === esim.id ? 'icon icon--spin' : 'icon'} />
                    {t(syncing === esim.id ? 'esims.refreshing' : 'esims.refresh')}
                  </button>
                </div>
                {open === esim.id ? <InstallDetails esim={esim} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <SecretLink device={deviceId()} />
    </Modal>
  );
}

const GB = 1024 ** 3;
const MB = 1024 ** 2;

function amount(bytes: number): string {
  return bytes >= GB ? `${(bytes / GB).toFixed(bytes >= 10 * GB ? 0 : 1)} GB` : `${Math.round(bytes / MB)} MB`;
}

/** One plan on an eSIM: what it is, how much is left, and until when. */
function PlanUsage({ plan, name, detail, flag }: { plan: EsimPlan; name?: string; detail?: string; flag?: string }) {
  const { t, locale } = useI18n();
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const waiting = plan.status === 'pending_activation';
  const total = plan.total_data_bytes ?? 0;
  const used = plan.used_data_bytes ?? 0;
  const left = plan.remaining_data_bytes ?? Math.max(0, total - used);
  // A plan that hasn't started yet has used nothing, whatever the counters say.
  const showBar = !waiting && !plan.is_unlimited && total > 0;
  const state = waiting
    ? t('esims.notStarted')
    : plan.is_unlimited
      ? '∞ GB'
      : total > 0
        ? t('esims.left', { left: amount(left), total: amount(total) })
        : (plan.status ?? '').replace(/_/g, ' ');
  const when =
    waiting && plan.must_activate_by
      ? t('esims.startBy', { date: day(plan.must_activate_by) })
      : plan.expires_at
        ? t('esims.until', { date: day(plan.expires_at) })
        : null;

  return (
    <li className="usage">
      <div className="usage__line">
        <span className="usage__name">
          {flag ? <img src={flag} alt="" width={18} height={18} /> : null}
          {[name, detail].filter(Boolean).join(' · ') || t('esims.plan')}
        </span>
        <span className="muted">{state}</span>
      </div>
      {showBar ? (
        <div
          className="usage__bar"
          role="progressbar"
          aria-valuenow={Math.round((used / total) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
        </div>
      ) : null}
      {when ? <p className="muted usage__expiry">{when}</p> : null}
    </li>
  );
}

/** One word for where an eSIM stands, from its newest plan. */
function esimState(
  t: ReturnType<typeof useI18n>['t'],
  esim: Esim,
): { label: string; tone: 'ready' | 'active' | 'ended' } {
  const status = esim.plans?.[0]?.status;
  if (status === 'pending_activation') return { label: t('esims.ready'), tone: 'ready' };
  if (status === 'active') return { label: t('esims.active'), tone: 'active' };
  if (status) return { label: status.replace(/_/g, ' '), tone: 'ended' };
  return { label: esim.status.replace(/_/g, ' '), tone: esim.status === 'active' ? 'active' : 'ended' };
}

/** "Europe", or "Europe +3" when more destinations share the eSIM: the newest first. */
function destinations(esim: Esim, catalogue: Catalogue | null): string {
  const names = (esim.plans ?? []).map((p) => {
    const plan = catalogue ? planOfPackage(catalogue, String(p.product_id ?? '')) : undefined;
    return plan ? planName(plan) : (p.product_name ?? '');
  });
  const unique = [...new Set(names.filter(Boolean))];
  return unique.length > 1 ? `${unique[0]} +${unique.length - 1}` : (unique[0] ?? '');
}
