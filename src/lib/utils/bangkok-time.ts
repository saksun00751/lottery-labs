/**
 * Every timestamp the lottery API returns is Bangkok local time written
 * without a UTC offset (`"2026-08-27 17:05:00"`). Read as-is by `Date` that
 * string is parsed as UTC, which is 7 hours off — so every value from this
 * backend is routed through here before it reaches a `Date`.
 */
export function bangkokToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${trimmed.replace(' ', 'T')}+07:00`;
}

/** Today's date in Bangkok, as `YYYY-MM-DD` — what `draw_date` expects. */
export function bangkokToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

/** `"2026-08-27"` -> `"27/08/2026"`, the label format round cards use. */
export function formatDrawDate(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}
