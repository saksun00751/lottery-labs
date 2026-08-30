import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { GamesView } from './GamesView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'games' });
  return { title: t('title') };
}

export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GamesView />;
}
