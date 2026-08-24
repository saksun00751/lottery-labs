import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeScript } from '@/components/layout/ThemeScript';
import { publicEnv } from '@/config/env.public';
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
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Members zoom to read slip numbers — never lock that away.
  maximumScale: 5,
  viewportFit: 'cover' as const,
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

  return (
    // The font variables must sit on <html>: globals.scss resolves
    // `--font-ui` there, and a var() defined further down the tree would make
    // that whole declaration invalid.
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
