import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
import { useEffect, useRef, useState } from 'react';

import {
  deviceId,
  fulfil,
  type InstallDetails as Details,
  orderStatus,
  type OrderStatus,
  purchase,
  type Quote,
  quote,
  stripeKey,
} from '../api/account';
import { AtliError, type Package, type Plan } from '../api/atli';
import { formatPrice, planName } from '../catalogue';
import { packageLabel, useI18n } from '../i18n/context';
import { IS_SANDBOX } from '../config';
import { planSubject } from '../art';
import { AlertIcon, CheckIcon, LockIcon, QrIcon, ShieldIcon } from './icons';
import { InstallDetails } from './InstallDetails';
import { Modal } from './Modal';
import { ProductCard } from './ProductCard';
import { SecretLink } from './SecretLink';

const POLL_MS = 2000;
const POLL_LIMIT = 90; // three minutes
const READY: OrderStatus[] = ['completed', 'fulfilled'];
const FAILED: OrderStatus[] = ['failed', 'failed_needs_intervention', 'cancelled', 'expired', 'refunded'];

/** Takes the order and Stripe's own parameters out of the address once read. */
function clearReturnParams() {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['order', 'payment_intent', 'payment_intent_client_secret', 'redirect_status']) params.delete(key);
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

type Phase =
  | { name: 'preparing' }
  | { name: 'paying'; quote: Quote; orderId: string }
  | { name: 'finishing'; orderId: string }
  | { name: 'done'; esim: Details; topUp: boolean }
  | { name: 'failed'; message: string; orderId?: string };

interface Props {
  /** What's being bought. Left out when coming back from a payment redirect. */
  plan?: Plan;
  pkg?: Package;
  currency: string;
  locale: string;
  /** Coming back from a payment redirect: pick up this order where it was left. */
  resumeOrder?: string;
  onClose: () => void;
  /** The device now has an eSIM, so the store can offer "My eSIMs". */
  onPurchased: () => void;
}

/**
 * Buying one package: a quote with the store's referral discount, Stripe's
 * card form on Atli's Stripe account, then waiting for the eSIM and showing
 * how to install it, with the secret link to get back to it.
 */
export function CheckoutDialog({ plan, pkg, currency, locale, resumeOrder, onClose, onPurchased }: Props) {
  const [phase, setPhase] = useState<Phase>(
    resumeOrder ? { name: 'finishing', orderId: resumeOrder } : { name: 'preparing' },
  );
  const { t } = useI18n();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const mount = useRef<HTMLDivElement>(null);
  const stripe = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  // One key per dialog: a retried purchase returns the same order rather than a second one.
  const idempotencyKey = useRef(crypto.randomUUID());
  /** Whether the quote put the plan on a new eSIM, or on one already installed. */
  const newEsim = useRef<boolean | undefined>(undefined);

  // Whether the dialog is still on screen, for work that outlives an effect.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // 1. Quote and order, then Stripe's form for it. Once per dialog: a second
  // quote would replace the first, and React runs effects twice in development.
  const started = useRef(false);
  useEffect(() => {
    if (phase.name !== 'preparing' || !pkg || started.current) return;
    started.current = true;
    const cancelled = () => !alive.current;
    (async () => {
      try {
        deviceId();
        const [q, key] = await Promise.all([quote(pkg.id, currency, locale), stripeKey()]);
        newEsim.current = q.new_esim;
        const order = await purchase(q.quote_id, idempotencyKey.current);
        if (cancelled()) return;
        // A $0 order (credits, a voucher) is already paid: no card needed.
        if (order.status === 'paid' || !order.client_secret) {
          setPhase({ name: 'finishing', orderId: order.order_id });
          return;
        }
        const instance = await loadStripe(key.publishable_key);
        if (!instance || cancelled()) return;
        const style = getComputedStyle(document.documentElement);
        const color = (name: string) => style.getPropertyValue(name).trim();
        const elements = instance.elements({
          clientSecret: order.client_secret,
          locale: locale as 'auto',
          appearance: {
            theme: document.documentElement.dataset.theme === 'dark' ? 'night' : 'stripe',
            variables: {
              colorPrimary: color('--accent'),
              colorBackground: color('--surface'),
              colorText: color('--text'),
              borderRadius: '10px',
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            },
          },
        });
        stripe.current = { stripe: instance, elements };
        setPhase({ name: 'paying', quote: q, orderId: order.order_id });
      } catch (e) {
        if (!cancelled()) setPhase({ name: 'failed', message: describe(t, e) });
      }
    })();
  }, [phase.name, pkg, currency, locale, t]);

  // Stripe's form goes in once its box is on the page.
  useEffect(() => {
    if (phase.name !== 'paying' || !stripe.current || !mount.current) return;
    // No Stripe Link: its sign-up box (email, phone, name) is a distraction in a one-off purchase.
    const element = stripe.current.elements.create('payment', { layout: 'tabs', wallets: { link: 'never' } });
    element.mount(mount.current);
    return () => element.destroy();
  }, [phase.name]);

  // 3. Paid: ask Atli to issue the eSIM, then wait for its install details.
  useEffect(() => {
    if (phase.name !== 'finishing') return;
    const { orderId } = phase;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const done = (esim: Details) => {
      clearReturnParams();
      onPurchased();
      setPhase({ name: 'done', esim, topUp: newEsim.current === false });
    };
    const poll = async () => {
      attempts += 1;
      try {
        const update =
          attempts === 1 ? await fulfil(orderId).catch(() => orderStatus(orderId)) : await orderStatus(orderId);
        if (cancelled) return;
        if (READY.includes(update.status) && update.esim?.qr_string) return done(update.esim);
        if (FAILED.includes(update.status)) {
          clearReturnParams();
          return setPhase({
            name: 'failed',
            orderId,
            message: t('checkout.notCompleted', { status: update.status.replace(/_/g, ' ') }),
          });
        }
      } catch {
        // A hiccup while waiting: keep waiting.
      }
      if (attempts >= POLL_LIMIT) {
        return setPhase({
          name: 'failed',
          orderId,
          message: t('checkout.slow'),
        });
      }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `onPurchased` is the App's stable callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name === 'finishing' ? phase.orderId : null]);

  // 2. Pay. Most cards finish here; some go to their bank and come back with ?order=…
  const pay = async () => {
    if (phase.name !== 'paying' || !stripe.current) return;
    setPaying(true);
    setPayError('');
    const { stripe: instance, elements } = stripe.current;
    const returnUrl = new URL(window.location.href);
    returnUrl.search = '';
    returnUrl.hash = '';
    returnUrl.searchParams.set('order', phase.orderId);
    const { error } = await instance.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl.toString() },
      redirect: 'if_required',
    });
    setPaying(false);
    if (error) {
      // A declined or mistyped card can simply be tried again. Anything else leaves this
      // payment unusable, so start a fresh one rather than repeat the same error.
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setPayError(error.message ?? t('checkout.declined'));
        return;
      }
      idempotencyKey.current = crypto.randomUUID();
      started.current = false;
      stripe.current = null;
      setPayError(t('checkout.fresh'));
      setPhase({ name: 'preparing' });
      return;
    }
    setPhase({ name: 'finishing', orderId: phase.orderId });
  };

  const title = t(phase.name === 'done' ? 'checkout.ready' : 'checkout.title');
  const product =
    plan && pkg ? (
      <ProductCard subject={planSubject(plan)} title={planName(plan)} detail={packageLabel(t, pkg)} />
    ) : null;

  return (
    <Modal title={title} onClose={onClose} closable={!paying}>
      {phase.name === 'preparing' ? (
        <div className="pay" aria-busy="true">
          {product}
          {payError ? (
            <p className="notice-inline notice-inline--error" role="alert">
              <AlertIcon /> {payError}
            </p>
          ) : null}
          {/* The shape of what's coming, so the dialog doesn't jump when it arrives. */}
          <div className="skeleton skeleton--summary" />
          <div className="skeleton skeleton--card" role="status">
            <span className="spinner" aria-hidden />
            {t('checkout.gettingPrice')}
          </div>
          <div className="skeleton skeleton--button" />
        </div>
      ) : null}

      {phase.name === 'paying' ? (
        <div className="pay">
          {product}
          <dl className="summary">
            {phase.quote.total_discount_cents > 0 ? (
              <div>
                <dt>{t('checkout.price')}</dt>
                <dd>{money(phase.quote.subtotal_cents, phase.quote.currency)}</dd>
              </div>
            ) : null}
            {phase.quote.total_discount_cents > 0 ? (
              <div className="summary__discount">
                <dt>{t(phase.quote.referral_discount_cents > 0 ? 'checkout.partnerDiscount' : 'checkout.discount')}</dt>
                <dd>−{money(phase.quote.total_discount_cents, phase.quote.currency)}</dd>
              </div>
            ) : null}
            <div className="summary__total">
              <dt>{t('checkout.total')}</dt>
              <dd>{money(phase.quote.net_total_cents, phase.quote.currency)}</dd>
            </div>
          </dl>
          <div className="pay__card">
            <h3 className="section-title">{t('checkout.payment')}</h3>
            {IS_SANDBOX ? <p className="pay__test">{t('checkout.testCard', { card: '4242 4242 4242 4242' })}</p> : null}
            <div ref={mount} className="pay__element" />
          </div>
          {payError ? (
            <p className="notice-inline notice-inline--error" role="alert">
              <AlertIcon /> {payError}
            </p>
          ) : null}
          <button type="button" className="primary primary--wide" onClick={pay} disabled={paying}>
            {paying ? <span className="spinner spinner--small" aria-hidden /> : <LockIcon />}
            {paying
              ? t('checkout.paying')
              : t('checkout.payAmount', { amount: money(phase.quote.net_total_cents, phase.quote.currency) })}
          </button>
          <p className="pay__note">
            <ShieldIcon /> {t('checkout.note')}
          </p>
        </div>
      ) : null}

      {phase.name === 'finishing' ? (
        <>
          {product}
          <div className="checkout-state" role="status">
            <span className="spinner" aria-hidden />
            <strong>{t('checkout.received')}</strong>
            <span>{t('checkout.preparing')}</span>
          </div>
        </>
      ) : null}

      {phase.name === 'done' ? (
        <div className="done">
          <div className="success">
            <span className="success__mark">
              <CheckIcon width={22} height={22} strokeWidth={3} />
            </span>
            <div>
              <strong>{t('checkout.complete')}</strong>
              <span>
                {phase.topUp
                  ? t('checkout.addedTo', { iccid: phase.esim.iccid.slice(-6) })
                  : t('checkout.readyToInstall')}
              </span>
            </div>
          </div>
          {product}
          {phase.topUp ? (
            <details className="install__again">
              <summary>
                <QrIcon /> {t('checkout.installAgain')}
              </summary>
              <InstallDetails esim={phase.esim} />
            </details>
          ) : (
            <InstallDetails esim={phase.esim} />
          )}
          <SecretLink device={deviceId()} />
        </div>
      ) : null}

      {phase.name === 'failed' ? (
        <div className="checkout-state checkout-state--failed" role="alert">
          <span className="failure__mark">
            <AlertIcon width={22} height={22} />
          </span>
          <strong>{phase.message}</strong>
          {phase.orderId ? <span className="muted">{t('checkout.order', { id: phase.orderId })}</span> : null}
          <button type="button" className="secondary" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}

function money(cents: number, currency: string): string {
  return formatPrice(cents / 100, currency.toUpperCase());
}

function describe(t: ReturnType<typeof useI18n>['t'], error: unknown): string {
  if (error instanceof AtliError) {
    if (error.code === 'price_changed') return t('checkout.priceChanged');
    if (error.status === 0) return t('checkout.unreachable');
    return `${error.message} (${error.code})`;
  }
  return t('checkout.failed');
}
