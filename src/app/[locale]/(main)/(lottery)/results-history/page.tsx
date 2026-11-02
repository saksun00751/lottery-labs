import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { ResultsHistoryView } from './ResultsHistoryView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'lottery.resultsHistory' });
  return { title: t('title') };
}

export default async function ResultsHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ResultsHistoryView />;
}
