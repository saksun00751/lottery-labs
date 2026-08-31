import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { publicEnv } from '@/config/env.public';
import { routing } from '@/i18n/routing';
import { getSiteMeta } from '@/lib/site-meta';

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
  const siteMeta = await getSiteMeta();
  const siteName = siteMeta.name ?? siteMeta.site_name ?? publicEnv.siteName;
  const favicon = siteMeta.favicon ?? siteMeta.favicon_url ?? siteMeta.faviconUrl ?? '/icon.svg';

  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: t('appName'),
    applicationName: siteName,
    formatDetection: { telephone: false },
    appleWebApp: {
      capable: true,
      title: siteName,
      statusBarStyle: 'black-translucent',
    },
    icons: {
      icon: favicon,
      apple: favicon,
    },
    other: siteMeta.header_code || siteMeta.headerCode ? {
      'x-header-code': siteMeta.header_code ?? siteMeta.headerCode ?? '',
    } : undefined,
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

  // Always the .env default on the server — this is what makes every
  // refresh reset to the configured appearance instead of a member's
  // previous in-session pick.
  const theme = publicEnv.defaultTheme;
  const mode = publicEnv.defaultColorMode;

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
