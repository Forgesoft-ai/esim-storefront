import { LANGUAGES, type Locale } from '../i18n/locales';
import { PickerMenu } from './PickerMenu';
import { useI18n } from '../i18n/context';

/** The language the store, and the names it gets from the API, are in. */
export function LanguagePicker({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  const { t } = useI18n();
  return (
    <PickerMenu
      ariaLabel={`${t('language')}: ${LANGUAGES.find(([code]) => code === locale)?.[1] ?? locale}`}
      heading={t('language')}
      trigger={<span>{locale.toUpperCase()}</span>}
      selected={locale}
      options={LANGUAGES.map(([code, name]) => ({
        value: code,
        label: <span lang={code}>{name}</span>,
        hint: code.toUpperCase(),
      }))}
      onSelect={(code) => onChange(code as Locale)}
    />
  );
}
