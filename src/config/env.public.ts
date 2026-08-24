import { z } from 'zod';

/**
 * Client-safe configuration.
 *
 * Every `process.env.NEXT_PUBLIC_*` lookup below is written out in full so the
 * Next.js compiler can inline it into the browser bundle — dynamic lookups
 * (`process.env[key]`) are NOT replaced and would be `undefined` at runtime.
 */

const booleanish = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z.object({
  useMock: booleanish,
  loginMode: z.enum(['username', 'phone']).default('username'),
  locales: z
    .string()
    .default('th,en,my,lo,km')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  defaultLocale: z.string().default('th'),
  defaultTheme: z.string().default('black-gold'),
  defaultColorMode: z.enum(['dark', 'light', 'system']).default('dark'),
  siteName: z.string().default('Lottery Labs'),
  contact: z.object({
    line: z.string().default(''),
    telegram: z.string().default(''),
    phone: z.string().default(''),
    email: z.string().default(''),
  }),
  features: z.object({
    referral: booleanish,
    promotion: booleanish,
    diamond: booleanish,
  }),
});

const parsed = schema.safeParse({
  useMock: process.env.NEXT_PUBLIC_USE_MOCK,
  loginMode: process.env.NEXT_PUBLIC_LOGIN_MODE,
  locales: process.env.NEXT_PUBLIC_LOCALES,
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  defaultTheme: process.env.NEXT_PUBLIC_DEFAULT_THEME,
  defaultColorMode: process.env.NEXT_PUBLIC_DEFAULT_COLOR_MODE,
  siteName: process.env.NEXT_PUBLIC_SITE_NAME,
  contact: {
    line: process.env.NEXT_PUBLIC_CONTACT_LINE,
    telegram: process.env.NEXT_PUBLIC_CONTACT_TELEGRAM,
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE,
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  },
  features: {
    referral: process.env.NEXT_PUBLIC_ENABLE_REFERRAL,
    promotion: process.env.NEXT_PUBLIC_ENABLE_PROMOTION,
    diamond: process.env.NEXT_PUBLIC_ENABLE_DIAMOND,
  },
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment configuration:\n${z.prettifyError(parsed.error)}`,
  );
}

export const publicEnv = parsed.data;
export type PublicEnv = typeof publicEnv;
