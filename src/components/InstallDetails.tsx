import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import type { InstallDetails as Details } from '../api/account';
import { ENV } from '../config';
import { CopyButton } from './CopyButton';
import { AndroidIcon, AppleIcon, ExternalIcon, KeyboardIcon, QrIcon } from './icons';
import { useI18n } from '../i18n/context';

/** Base64url, as Atli's eSIM page expects its `lpa`. */
function base64url(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Everything needed to install an eSIM: a QR code to scan from another
 * screen, the one-tap links that open the phone's own eSIM setup, and the
 * details to type in by hand.
 */
export function InstallDetails({ esim }: { esim: Details }) {
  const { t } = useI18n();
  const [qr, setQr] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(esim.qr_string, { margin: 1, width: 400, errorCorrectionLevel: 'M' }).then(
      (url) => !cancelled && setQr(url),
      () => !cancelled && setQr(''),
    );
    return () => {
      cancelled = true;
    };
  }, [esim.qr_string]);

  const carddata = encodeURIComponent(`LPA:1$${esim.lpa_address}$${esim.activation_code}`);
  const iphone = `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${carddata}`;
  const android = `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${carddata}`;
  // Atli's own page for it: the QR code, both links, and the plans and data left, with no account.
  const atliPage = `${ENV.siteBase}/my/esim?lpa=${base64url(esim.qr_string)}&iccid=${encodeURIComponent(esim.iccid)}`;

  return (
    <section className="install" aria-labelledby="install-title">
      <h3 id="install-title" className="section-title">
        {t('install.title')}
      </h3>
      <div className="install__grid">
        <div className="install__qr">
          {qr ? (
            <img src={qr} alt={t('install.qrAlt')} width={160} height={160} />
          ) : (
            <div className="install__qr-placeholder" />
          )}
        </div>
        <div className="install__ways">
          <p className="install__lead">
            <QrIcon /> {t('install.scan')}
          </p>
          <p className="install__lead">{t('install.onPhone')}</p>
          <div className="install__links">
            <a className="secondary" href={iphone} target="_blank" rel="noreferrer">
              <AppleIcon /> iPhone
            </a>
            <a className="secondary" href={android} target="_blank" rel="noreferrer">
              <AndroidIcon /> Android
            </a>
          </div>
        </div>
      </div>
      <details className="install__manual">
        <summary>
          <KeyboardIcon /> {t('install.manual')}
        </summary>
        <dl>
          <div>
            <dt>{t('install.smdp')}</dt>
            <dd>
              <code>{esim.lpa_address}</code> <CopyButton text={esim.lpa_address} label={t('install.copyAddress')} />
            </dd>
          </div>
          <div>
            <dt>{t('install.code')}</dt>
            <dd>
              <code>{esim.activation_code}</code>{' '}
              <CopyButton text={esim.activation_code} label={t('install.copyCode')} />
            </dd>
          </div>
          <div>
            <dt>ICCID</dt>
            <dd>
              <code>{esim.iccid}</code>
            </dd>
          </div>
        </dl>
      </details>
      <a className="text-link" href={atliPage} target="_blank" rel="noreferrer">
        {t('install.atli')} <ExternalIcon />
      </a>
    </section>
  );
}
