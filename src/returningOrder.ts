/** The order a payment redirect (3-D Secure, a bank's page) brings the visitor back for: `?order=…`. */
export function returningOrder(): string | null {
  return new URLSearchParams(window.location.search).get('order');
}
