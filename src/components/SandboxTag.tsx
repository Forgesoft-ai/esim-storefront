import { useI18n } from '../i18n/context';

/**
 * The corner tag heyatli.com shows on builds that talk to Atli's Sandbox:
 * test cards only, nothing real is charged or delivered. Same pill, same
 * flask (lucide's FlaskConical), in the bottom-right corner here.
 */
export function SandboxTag() {
  const { t } = useI18n();
  return (
    <div className="sandbox-tag" role="status" title={t('sandbox.title')}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
        <path d="M6.453 15h11.094" />
        <path d="M8.5 2h7" />
      </svg>
      {t('sandbox')}
    </div>
  );
}
