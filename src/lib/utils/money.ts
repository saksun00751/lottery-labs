import type { Minor } from '@/types';

/* =========================================================================
 *  Money is stored as an integer number of สตางค์ (1/100 THB) everywhere in
 *  the app. Formatting to a display string is the only place it becomes a
 *  decimal — no arithmetic is ever done on a float.
 * ========================================================================= */

export const MINOR_UNITS = 100;

/** 125.5 (baht typed by a human) -> 12550 */
export function toMinor(major: number | string): Minor {
  const value = typeof major === 'string' ? Number(major.replace(/,/g, '')) : major;
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * MINOR_UNITS);
}

/** 12550 -> 125.5 */
export function toMajor(minor: Minor): number {
  return minor / MINOR_UNITS;
}

export interface FormatMoneyOptions {
  locale?: string;
  /** Hide the ".00" tail when the amount is whole. */
  compactDecimals?: boolean;
  showSign?: boolean;
}

export function formatMoney(
  minor: Minor,
  { locale = 'th-TH', compactDecimals = false, showSign = false }: FormatMoneyOptions = {},
) {
  const value = toMajor(Math.abs(minor));
  const fraction = compactDecimals && minor % MINOR_UNITS === 0 ? 0 : 2;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fraction,
    maximumFractionDigits: 2,
  }).format(value);

  const sign = minor < 0 ? '-' : showSign ? '+' : '';
  return `${sign}${formatted}`;
}

/** Groups digits while the user is typing, keeping the caret sane. */
export function formatAmountInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  const decimals = rest.join('').slice(0, 2);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rest.length > 0 ? `${grouped}.${decimals}` : grouped;
}

export function parseAmountInput(raw: string): Minor {
  return toMinor(raw.replace(/,/g, ''));
}

/** Payout preview: stake 5 ฿ at 95x -> 475 ฿. */
export function calcPayout(stake: Minor, multiplier: number): Minor {
  return Math.round(stake * multiplier);
}

export function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${'x'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
