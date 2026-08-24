import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { WithdrawView } from './WithdrawView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'withdraw' });
  return { title: t('title') };
}

export default async function WithdrawPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WithdrawView />;
}
