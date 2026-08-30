/**
 * Maps an app locale to a BCP-47 tag for Intl.
 *
 * `-u-nu-latn` is deliberate: my-MM, km-KH and (in some ICU builds) lo-LA
 * default to their own numeral systems. Money and lottery numbers must stay in
 * Latin digits — a balance rendered as ၁၂,၈၄၅ is not what a player expects to
 * compare against their bank app.
 */
const INTL_LOCALES: Record<string, string> = {
  th: 'th-TH-u-nu-latn',
  en: 'en-US',
  my: 'my-MM-u-nu-latn',
  lo: 'lo-LA-u-nu-latn',
  km: 'km-KH-u-nu-latn',
};

export function intlLocale(locale: string) {
  return INTL_LOCALES[locale] ?? 'en-US';
}

/**
 * Thai dates are conventionally shown in the Buddhist era. Everyone else gets
 * the Gregorian calendar.
 */
export function calendarLocale(locale: string) {
  return locale === 'th' ? 'th-TH-u-nu-latn-ca-buddhist' : intlLocale(locale);
}

export function formatDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(calendarLocale(locale), options).format(date);
}

export function formatDateTime(value: string | number | Date, locale: string) {
  return formatDate(value, locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}
