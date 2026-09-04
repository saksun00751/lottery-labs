import { defineRouting } from 'next-intl/routing';

import { publicEnv } from '@/config/env.public';

export const LOCALES = ['th', 'en', 'my', 'lo', 'km'] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales actually turned on through NEXT_PUBLIC_LOCALES. */
export const enabledLocales = LOCALES.filter((l) =>
  publicEnv.locales.includes(l),
) as Locale[];

const activeLocales = enabledLocales.length > 0 ? enabledLocales : [...LOCALES];

const defaultLocale = (activeLocales as string[]).includes(
  publicEnv.defaultLocale,
)
  ? (publicEnv.defaultLocale as Locale)
  : activeLocales[0];

export const routing = defineRouting({
  locales: activeLocales,
  defaultLocale,
  localePrefix: 'always',
  // A visitor who hasn't picked a language yet (no `ll_locale` cookie) gets
  // `defaultLocale` as-is — browser Accept-Language is never consulted.
  localeDetection: false,
  localeCookie: {
    name: 'll_locale',
    maxAge: 60 * 60 * 24 * 365,
  },
});

/** Display metadata for the language switcher. */
export const localeMeta: Record<
  Locale,
  { label: string; native: string; flag: string; fontVar: string }
> = {
  th: { label: 'Thai', native: 'ไทย', flag: '🇹🇭', fontVar: 'var(--font-thai)' },
  en: { label: 'English', native: 'English', flag: '🇬🇧', fontVar: 'var(--font-latin)' },
  my: { label: 'Burmese', native: 'မြန်မာ', flag: '🇲🇲', fontVar: 'var(--font-myanmar)' },
  lo: { label: 'Lao', native: 'ລາວ', flag: '🇱🇦', fontVar: 'var(--font-lao)' },
  km: { label: 'Khmer', native: 'ខ្មែរ', flag: '🇰🇭', fontVar: 'var(--font-khmer)' },
};
