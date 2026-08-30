import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { TodayLotteryView } from './TodayLotteryView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('todayLottery') };
}

export default async function TodayLotteryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TodayLotteryView />;
}
