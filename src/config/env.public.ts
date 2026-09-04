/**
 * Client-safe configuration.
 *
 * Every `process.env.NEXT_PUBLIC_*` lookup below is written out in full so the
 * Next.js compiler can inline it into the browser bundle — dynamic lookups
 * (`process.env[key]`) are NOT replaced and would be `undefined` at runtime.
 *
 * Validated by hand instead of with Zod: this module is imported from
 * client components used on nearly every page (e.g. the theme store), and a
 * schema library big enough for the whole app pulls its entire bundle along
 * with it just to check a handful of enums and booleans.
 */

const errors: string[] = [];

function pickEnum<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  errors.push(`${name}: expected one of ${allowed.join(' | ')}, got "${value}"`);
  return fallback;
}

function pickBool(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  errors.push(`${name}: expected "true" or "false", got "${value}"`);
  return fallback;
}

function pickLocales(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const publicEnv = {
  loginMode: pickEnum(
    'NEXT_PUBLIC_LOGIN_MODE',
    process.env.NEXT_PUBLIC_LOGIN_MODE,
    ['username', 'phone'] as const,
    'username',
  ),
  siteMode: pickEnum(
    'NEXT_PUBLIC_SITE_MODE',
    process.env.NEXT_PUBLIC_SITE_MODE,
    ['lottery', 'games', 'both'] as const,
    'both',
  ),
  locales: pickLocales(process.env.NEXT_PUBLIC_LOCALES, 'th,en,my,lo,km'),
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'th',
  defaultTheme: process.env.NEXT_PUBLIC_DEFAULT_THEME ?? 'black-gold',
  defaultColorMode: pickEnum(
    'NEXT_PUBLIC_DEFAULT_COLOR_MODE',
    process.env.NEXT_PUBLIC_DEFAULT_COLOR_MODE,
    ['dark', 'light', 'system'] as const,
    'dark',
  ),
  logoWhiteBg: pickBool('NEXT_PUBLIC_LOGO_WHITE_BG', process.env.NEXT_PUBLIC_LOGO_WHITE_BG, true),
  features: {
    referral: pickBool('NEXT_PUBLIC_ENABLE_REFERRAL', process.env.NEXT_PUBLIC_ENABLE_REFERRAL, false),
    promotion: pickBool(
      'NEXT_PUBLIC_ENABLE_PROMOTION',
      process.env.NEXT_PUBLIC_ENABLE_PROMOTION,
      false,
    ),
    diamond: pickBool('NEXT_PUBLIC_ENABLE_DIAMOND', process.env.NEXT_PUBLIC_ENABLE_DIAMOND, false),
  },
};

if (errors.length) {
  throw new Error(`Invalid public environment configuration:\n${errors.join('\n')}`);
}

export type PublicEnv = typeof publicEnv;
