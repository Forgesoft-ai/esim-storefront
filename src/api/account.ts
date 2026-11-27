import { ENV, type EnvironmentName, isEnvironmentName } from '../config';
import { AtliError } from './atli';

/**
 * The visitor's Atli account, with no sign-up: a guest held by a device id.
 *
 * `POST /login` with a device id Atli hasn't seen creates a guest; the same id
 * signs that guest back in. The id is the only credential, so it's kept in this
 * browser, and it's what the secret link carries to another browser. Anyone
 * holding it can see and install this guest's eSIMs, so it's never logged or
 * sent anywhere but Atli's API.
 */

/** Each environment has its own accounts, so its own device: a Sandbox guest isn't a production one. */
const deviceKey = (environment: EnvironmentName) => `esim-storefront:${environment}:device`;
const LINKED_KEY = `esim-storefront:${ENV.name}:referral-linked`;
/** Renew a little before the token's 15 minutes are up. */
const EXPIRY_MARGIN_MS = 60_000;

export function storedDevice(environment: EnvironmentName = ENV.name): string | null {
  try {
    return localStorage.getItem(deviceKey(environment));
  } catch {
    return null;
  }
}

function storeDevice(id: string, environment: EnvironmentName = ENV.name) {
  try {
    localStorage.setItem(deviceKey(environment), id);
  } catch {
    // Without storage the device lasts this visit; the secret link still brings it back.
  }
}

/** The device, made on first need. */
export function deviceId(): string {
  const existing = storedDevice();
  if (existing) return existing;
  const id = crypto.randomUUID();
  storeDevice(id);
  token = null;
  return id;
}

/** Use another device, from a secret link, in its environment. Its token is fetched fresh. */
export function adoptDevice(id: string, environment: EnvironmentName = ENV.name) {
  storeDevice(id, environment);
  if (environment === ENV.name) token = null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isDeviceId = (value: string | null | undefined): value is string => !!value && UUID.test(value);

/**
 * The link that opens this store on this device's eSIMs in any browser, in its
 * environment. The id rides in the fragment (`#device=…&env=…`), which
 * browsers never send to a server.
 */
export function secretLink(id: string, environment: EnvironmentName = ENV.name): string {
  return `${window.location.origin}${window.location.pathname}#device=${id}&env=${environment}`;
}

/**
 * The device and environment of a secret link in the current address, removed
 * from the address once read. A link without an environment is Sandbox's.
 */
export function takeDeviceFromLink(): { id: string; environment: EnvironmentName } | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const id = params.get('device');
  if (!id) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  const environment = params.get('env');
  if (!isDeviceId(id)) return null;
  return { id, environment: isEnvironmentName(environment) ? environment : 'sandbox' };
}

let token: { value: string; device: string; expires: number } | null = null;

async function call<T>(method: string, path: string, body?: unknown, auth = true, locale = 'en'): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Locale': locale };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${await accessToken()}`;
  let response: Response;
  try {
    response = await fetch(new URL(`${ENV.apiPath}${path}`, window.location.origin), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AtliError(0, 'network_error', "Couldn't reach the store's API.");
  }
  if (response.status === 401 && auth) token = null;
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AtliError(response.status, error.code ?? 'unknown', error.message ?? response.statusText, error.trace_id);
  }
  return response.json() as Promise<T>;
}

/**
 * A token for the device, signing in again when it's near its end. Signing in
 * with the device id is as good as refreshing, and needs nothing else kept.
 */
async function accessToken(): Promise<string> {
  const device = deviceId();
  if (token && token.device === device && token.expires > Date.now()) return token.value;
  // Calls that start together share one sign-in: two at once for a new device
  // would both try to create its guest, and the second would be refused.
  if (!signingIn || signingIn.device !== device) {
    const pending = signIn(device).finally(() => {
      if (signingIn?.promise === pending) signingIn = null;
    });
    signingIn = { device, promise: pending };
  }
  return signingIn.promise;
}

let signingIn: { device: string; promise: Promise<string> } | null = null;

async function signIn(device: string): Promise<string> {
  const login = async () => call<{ token: string; expires_in: number }>('POST', '/login', { device_id: device }, false);
  let answer: { token: string; expires_in: number };
  try {
    answer = await login();
  } catch (e) {
    // Created a moment ago by another tab: signing in again finds it.
    if (!(e instanceof AtliError && e.code === 'user_already_exists')) throw e;
    answer = await login();
  }
  token = { value: answer.token, device, expires: Date.now() + answer.expires_in * 1000 - EXPIRY_MARGIN_MS };
  await linkReferral(device);
  return token.value;
}

/**
 * Link a new guest to the store's partner code, once per device, before its
 * first quote. Its discount, if the code has one, then applies by itself.
 * Only someone with no partner and no purchase yet can be linked; any other
 * answer just means there's nothing to do.
 */
async function linkReferral(device: string) {
  if (!ENV.referralCode) return;
  let linked: string | null = null;
  try {
    linked = localStorage.getItem(LINKED_KEY);
  } catch {
    // Without storage it may try again next time, and Atli answers `already`.
  }
  if (linked === device) return;
  try {
    await call('POST', '/user/referral/redeem', { code: ENV.referralCode }, true);
  } catch {
    // A referral that can't be linked never stops a purchase.
  }
  try {
    localStorage.setItem(LINKED_KEY, device);
  } catch {
    // As above.
  }
}

export interface Quote {
  quote_id: string;
  subtotal_cents: number;
  referral_discount_cents: number;
  voucher_discount_cents: number;
  points_discount_cents: number;
  total_discount_cents: number;
  net_total_cents: number;
  currency: string;
  expires_at: string;
  /** False when the plan goes onto an eSIM the person already has: nothing new to install. */
  new_esim?: boolean;
}

/** A stored quote: the price to show, and the one that will be charged. */
export function quote(productId: string, currency: string, locale: string): Promise<Quote> {
  return call('POST', '/plan/quote', { product_id: productId, currency, store: true }, true, locale);
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'completed'
  | 'fulfilled'
  | 'failed'
  | 'failed_needs_intervention'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | (string & {});

export interface Purchase {
  order_id: string;
  client_secret: string;
  total_amount_cents: number;
  status: OrderStatus;
}

/** Buy the quote. The same idempotency key never buys twice, so a retry is safe. */
export function purchase(quoteId: string, idempotencyKey: string): Promise<Purchase> {
  return call('POST', '/plan/purchase', { quote_id: quoteId, idempotency_key: idempotencyKey });
}

export interface InstallDetails {
  id: string;
  iccid: string;
  lpa_address: string;
  activation_code: string;
  qr_string: string;
}

export interface OrderUpdate {
  order_id: string;
  status: OrderStatus;
  esim?: InstallDetails;
}

/** Tell Atli the payment went through, so it issues the eSIM now. Safe to repeat. */
export function fulfil(orderId: string): Promise<OrderUpdate> {
  return call('POST', '/plan/fulfill-payment', { order_id: orderId });
}

export function orderStatus(orderId: string): Promise<OrderUpdate> {
  return call('GET', `/fulfillment/status-updates?order_id=${encodeURIComponent(orderId)}`);
}

export interface EsimPlan {
  id: string;
  /** The package bought: an `id` from the catalogue's packages. */
  product_id?: string;
  /** The destination: "Japan". */
  product_name?: string;
  /** "5 days · ∞ GB", in the language asked for. */
  title?: string;
  /** `pending_activation` until the eSIM first connects, then `active`, then `expired`. */
  status?: string;
  is_unlimited?: boolean;
  duration_days?: number;
  total_data_bytes?: number;
  used_data_bytes?: number;
  remaining_data_bytes?: number;
  /** When it must be first used by, while it waits. */
  must_activate_by?: string | null;
  expires_at?: string | null;
}

export interface Esim extends InstallDetails {
  name?: string;
  status: string;
  created_at: string;
  order_id?: string;
  plans?: EsimPlan[];
}

/** This device's eSIMs, with their plans and data used as of the last sync. */
export async function listEsims(locale: string): Promise<Esim[]> {
  const body = await call<Esim[] | { items: Esim[] }>('GET', '/esims', undefined, true, locale);
  return Array.isArray(body) ? body : body.items;
}

/** Ask the network for an eSIM's current data use. Throttled: call it when asked, not on a timer. */
export function syncEsim(id: string): Promise<unknown> {
  return call('POST', `/esims/${encodeURIComponent(id)}/sync`);
}

/** Atli's Stripe publishable key, which differs between Sandbox and production. */
export function stripeKey(): Promise<{ publishable_key: string }> {
  return call('GET', '/stripe/config', undefined, false);
}
