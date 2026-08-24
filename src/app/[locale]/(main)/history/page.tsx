import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { HistoryView } from './HistoryView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'history' });
  return { title: t('title') };
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HistoryView />;
}
