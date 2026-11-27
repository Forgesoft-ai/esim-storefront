import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useI18n } from '../i18n/context';
import type { Key } from '../i18n/translate';
import { markOnboarded } from '../onboarding';
import { CloseIcon, GlobeIcon, KeyIcon, LockIcon, QrIcon, SearchIcon, SimIcon } from './icons';

const GAP = 12;
const MARGIN = 12;

/** The search box the visitor can see: the header's on a wide screen, the sheet's on a phone. */
function visibleSearch(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('.search')].find((search) => search.offsetParent !== null);
}

function focusSearch() {
  visibleSearch()?.querySelector('input')?.focus();
}

interface Place {
  top: number;
  left: number;
  /** Where the arrow points, from the popover's start edge. */
  arrow: number;
  /** Below the search in the header, above it on a phone's sheet. */
  side: 'below' | 'above';
  /** The height there is on that side. */
  room: number;
}

const STEPS: { Icon: typeof GlobeIcon; title: Key; body: Key }[] = [
  { Icon: GlobeIcon, title: 'onboarding.find', body: 'onboarding.findBody' },
  { Icon: SimIcon, title: 'onboarding.choose', body: 'onboarding.chooseBody' },
  { Icon: LockIcon, title: 'onboarding.pay', body: 'onboarding.payBody' },
  { Icon: QrIcon, title: 'onboarding.install', body: 'onboarding.installBody' },
];

/**
 * A first visit's welcome, beside the search rather than over the page: what
 * this is, the four steps from a destination to an installed eSIM, and a
 * button into the search it points at.
 */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  const close = (thenSearch: boolean) => {
    markOnboarded();
    onClose();
    if (thenSearch) setTimeout(focusSearch, 0);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Follow the search: on resizing, and when the phone's sheet settles.
  useLayoutEffect(() => {
    const popover = ref.current;
    if (!popover) return;
    const measure = () => {
      const search = visibleSearch();
      if (!search) return setPlace(null);
      const box = search.getBoundingClientRect();
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const below = window.innerHeight - box.bottom - GAP - MARGIN;
      const above = box.top - GAP - MARGIN;
      const side = height <= below || below >= above ? 'below' : 'above';
      const room = side === 'below' ? below : above;
      const centre = box.left + box.width / 2;
      const left = Math.min(Math.max(centre - width / 2, MARGIN), window.innerWidth - width - MARGIN);
      const top = side === 'below' ? box.bottom + GAP : box.top - GAP - Math.min(height, room);
      setPlace({ top, left, room, arrow: Math.min(Math.max(centre - left, 24), width - 24), side });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(popover);
    document.querySelectorAll('.search').forEach((search) => observer.observe(search));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, []);

  // Escape, or starting on the page some other way, puts it away for good.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      closeRef.current(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="onboarding-title"
      className={`onboarding onboarding--${place?.side ?? 'below'}`}
      style={
        place
          ? ({
              top: place.top,
              left: place.left,
              maxHeight: place.room,
              '--arrow': `${place.arrow}px`,
            } as CSSProperties)
          : { visibility: 'hidden' }
      }
    >
      <button
        type="button"
        className="icon-button onboarding__close"
        onClick={() => close(false)}
        aria-label={t('close')}
      >
        <CloseIcon />
      </button>
      <div className="onboarding__body">
        <h2 id="onboarding-title">{t('onboarding.title')}</h2>
        <p className="onboarding__lead">{t('onboarding.lead')}</p>
        <ol className="onboarding__steps">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title}>
              <span className="onboarding__icon" aria-hidden>
                <Icon width={18} height={18} />
                <span className="onboarding__number">{i + 1}</span>
              </span>
              <span className="onboarding__text">
                <strong>{t(title)}</strong>
                <span>{t(body)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="onboarding__note">
          <KeyIcon /> {t('onboarding.noAccount')}
        </p>
        <div className="onboarding__actions">
          <button type="button" className="primary" onClick={() => close(true)} autoFocus>
            <SearchIcon /> {t('onboarding.search')}
          </button>
          <button type="button" className="link" onClick={() => close(false)}>
            {t('onboarding.explore')}
          </button>
        </div>
      </div>
    </div>
  );
}
