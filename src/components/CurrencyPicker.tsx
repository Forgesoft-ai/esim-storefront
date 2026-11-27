import type { Currency } from '../api/atli';
import { PickerMenu } from './PickerMenu';
import { useI18n } from '../i18n/context';

/** A currency's name in the chosen language, from the browser: "Japanese Yen", "日本円". */
function currencyName(code: string, locale: string, fallback: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  currency: string;
  currencies: Currency[];
  locale: string;
  onChange: (code: string) => void;
}

/** The currency prices are shown and paid in. */
export function CurrencyPicker({ currency, currencies, locale, onChange }: Props) {
  const { t } = useI18n();
  const list = currencies.length ? currencies : [{ code: currency, symbol: '', name: currency, decimal_digits: 2 }];
  const current = list.find((c) => c.code === currency);
  return (
    <PickerMenu
      // A symbol alone tells a screen reader little, and several currencies share "$".
      ariaLabel={`${t('currency')}: ${currency}`}
      heading={t('currency')}
      trigger={
        <>
          {current?.symbol ? <span className="muted">{current.symbol}</span> : null}
          <span>{currency}</span>
        </>
      }
      selected={currency}
      options={list.map((c) => ({
        value: c.code,
        lead: c.symbol,
        label: currencyName(c.code, locale, c.name),
        hint: c.code,
      }))}
      onSelect={onChange}
    />
  );
}
