const SEEN_KEY = 'esim-storefront:onboarded';

/**
 * Whether to welcome this visitor: only on a first visit, and only when they
 * arrive at the store itself rather than through a link that already says
 * what they want (a destination, a returning payment, a private link).
 */
export function shouldOnboard(): boolean {
  const { search, hash } = window.location;
  if (/[?&](d|order)=/.test(search) || hash.includes('device=')) return false;
  try {
    return localStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Without storage it may show again next time; nothing breaks.
  }
}
