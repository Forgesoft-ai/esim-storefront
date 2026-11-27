import { secretLink } from '../api/account';
import { CopyButton } from './CopyButton';
import { AlertIcon, KeyIcon } from './icons';
import { useI18n } from '../i18n/context';

/**
 * The link back to this device's eSIMs. There's no account and no password:
 * this browser remembers the device, and the link brings it to any other.
 */
export function SecretLink({ device }: { device: string }) {
  const { t } = useI18n();
  const link = secretLink(device);
  return (
    <section className="secret" aria-labelledby="secret-title">
      <div className="secret__head">
        <span className="secret__icon">
          <KeyIcon width={18} height={18} />
        </span>
        <div>
          <h3 id="secret-title">{t('secret.title')}</h3>
          <p>{t('secret.body')}</p>
        </div>
      </div>
      <div className="secret__link">
        {/* Its start and its end, which tell links apart; the whole link is what's copied. */}
        <code title={link}>
          {link.slice(0, link.indexOf('#') + 8)}…{link.slice(-6)}
        </code>
        <CopyButton text={link}>{t('copy')}</CopyButton>
      </div>
      <p className="secret__warning">
        <AlertIcon /> {t('secret.warning')}
      </p>
    </section>
  );
}
