import { ENV, type EnvironmentName, switchEnvironment } from '../config';
import { useI18n } from '../i18n/context';
import { FlaskIcon, GlobeIcon } from './icons';

const OPTIONS: { name: EnvironmentName; Icon: typeof FlaskIcon }[] = [
  { name: 'sandbox', Icon: FlaskIcon },
  { name: 'production', Icon: GlobeIcon },
];

/**
 * Sandbox or Production, as on Atli's Partners site: the chosen one is
 * coloured, Sandbox in the yellow of its tag, Production in red since it
 * charges real cards. Switching starts the page again in that environment.
 */
export function EnvironmentSwitch() {
  const { t } = useI18n();
  return (
    <div className="env-switch" role="group" aria-label={t('env.label')}>
      {OPTIONS.map(({ name, Icon }) => (
        <button
          key={name}
          type="button"
          className={`env-switch__option env-switch__option--${name}`}
          aria-pressed={ENV.name === name}
          title={t(name === 'sandbox' ? 'env.sandbox' : 'env.production')}
          onClick={() => switchEnvironment(name)}
        >
          <Icon />
          <span>{t(name === 'sandbox' ? 'env.sandbox' : 'env.production')}</span>
        </button>
      ))}
    </div>
  );
}
