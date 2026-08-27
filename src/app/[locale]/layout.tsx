import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { publicEnv } from '@/config/env.public';
import { MODE_COOKIE, THEME_COOKIE } from '@/config/theme';
import { routing } from '@/i18n/routing';

import { fontVariables } from '../fonts';
import { Providers } from '../providers';

import '@/styles/globals.scss';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return {
    title: {
      default: publicEnv.siteName,
      template: `%s · ${publicEnv.siteName}`,
    },
    description: t('appName'),
    applicationName: publicEnv.siteName,
    formatDetection: { telephone: false },
    appleWebApp: {
      capable: true,
      title: publicEnv.siteName,
      statusBarStyle: 'black-translucent',
    },
    icons: {
      icon: '/icon.svg',
      apple: '/icon.svg',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Members zoom to read slip numbers — never lock that away.
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08080a' },
    { media: '(prefers-color-scheme: light)', color: '#f6f4ef' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The appearance the member last picked, mirrored into cookies by the theme
  // store. Rendering it here means the very first paint is already correct —
  // no flash, and no inline bootstrap script (which React re-renders, and
  // warns about, on every locale switch).
  const store = await cookies();
  const theme = safeToken(store.get(THEME_COOKIE)?.value, publicEnv.defaultTheme);
  const mode = safeToken(store.get(MODE_COOKIE)?.value, publicEnv.defaultColorMode);

  return (
    // The font variables must sit on <html>: globals.scss resolves
    // `--font-ui` there, and a var() defined further down the tree would make
    // that whole declaration invalid.
    //
    // `data-scroll-behavior` opts back into Next's scroll override: globals.scss
    // sets `scroll-behavior: smooth` for in-page jumps, and without this every
    // route change would smooth-scroll to the top instead of landing there.
    <html
      lang={locale}
      className={fontVariables}
      data-theme={theme}
      data-mode={mode}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/** Cookies are member-writable, so only a plain id is ever put in the DOM. */
function safeToken(value: string | undefined, fallback: string) {
  return value && /^[a-z][a-z0-9-]{0,31}$/.test(value) ? value : fallback;
}
