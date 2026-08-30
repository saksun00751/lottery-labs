import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { SlipView } from './SlipView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'lottery.slip' });
  return { title: t('title') };
}

export default async function SlipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SlipView />;
}
