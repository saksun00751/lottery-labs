import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { LotteryGroupsView } from './LotteryGroupsView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('lotteryGroups') };
}

export default async function LotteryGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LotteryGroupsView />;
}
