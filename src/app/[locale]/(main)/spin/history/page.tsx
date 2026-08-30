import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { SpinHistoryView } from './SpinHistoryView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'spin' });
  return { title: t('history') };
}

export default async function SpinHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SpinHistoryView />;
}
