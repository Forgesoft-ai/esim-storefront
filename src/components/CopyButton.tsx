import { useEffect, useRef, useState } from 'react';

import { CheckIcon, CopyIcon } from './icons';
import { useI18n } from '../i18n/context';

/** A small button that copies `text`, and says so for two seconds. */
export function CopyButton({ text, label, children }: { text: string; label?: string; children?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={children ? 'secondary' : 'copy'}
      aria-label={children ? undefined : (label ?? t('copy'))}
      title={label ?? t('copy')}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          return; // The text is on screen and can be selected by hand.
        }
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      }}
    >
      {/* Both words hold the button's width, so it doesn't jump when it answers. */}
      <span className="copy__words">
        <span className={copied ? 'is-hidden' : undefined}>
          <CopyIcon />
          {children}
        </span>
        <span className={copied ? undefined : 'is-hidden'} aria-live="polite">
          <CheckIcon />
          {children ? t('copied') : null}
        </span>
      </span>
    </button>
  );
}
