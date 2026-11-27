import type { SVGProps } from 'react';

/**
 * The store's icons, drawn inline in the style of lucide (24px grid, 2px
 * strokes), so no icon font or package is needed. Decorative by default: the
 * button or text beside each says what it is.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="icon"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const LockIcon = (p: P) => (
  <Icon {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Icon>
);

export const KeyIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2" />
  </Icon>
);

export const RefreshIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
);

export const SimIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <rect x="8" y="11" width="8" height="7" rx="1" />
  </Icon>
);

export const QrIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </Icon>
);

export const ExternalIcon = (p: P) => (
  <Icon {...p}>
    <path d="M15 3h6v6M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
);

export const KeyboardIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 17h8" />
  </Icon>
);

export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);

export const ShieldIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

/** Apple's mark, filled. */
export const AppleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden className="icon" {...p}>
    <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.2 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-4.2zM14 5.3c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
  </svg>
);

/** Android's robot head, filled. */
export const AndroidIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden className="icon" {...p}>
    <path d="M17.6 9.5 19.3 6.6a.4.4 0 0 0-.7-.4l-1.7 3a10.4 10.4 0 0 0-9.8 0l-1.7-3a.4.4 0 0 0-.7.4l1.7 2.9A9.7 9.7 0 0 0 2 17h20a9.7 9.7 0 0 0-4.4-7.5zM7 14.3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
  </svg>
);

export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

/** The flask Atli's sites mark Sandbox with (lucide's FlaskConical). */
export const FlaskIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
    <path d="M6.453 15h11.094" />
    <path d="M8.5 2h7" />
  </Icon>
);

export const GlobeIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);

/** A small grid of shaded squares: the price heatmap. */
export const HeatIcon = (p: P) => (
  <Icon {...p}>
    {/* A thermometer with soft heat waves rising beside it. */}
    <path d="M11 13.6V5.5a2.5 2.5 0 0 1 5 0v8.1a4.5 4.5 0 1 1-5 0Z" />
    <path d="M13.5 17.2V9.5" strokeWidth="2.2" />
    <circle cx="13.5" cy="17.2" r="1.6" fill="currentColor" stroke="none" />
    <path d="M5.5 4.5c-1.2 1.3 1.2 2.7 0 4s1.2 2.7 0 4" strokeWidth="1.6" />
  </Icon>
);
