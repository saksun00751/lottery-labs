import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { DepositView } from './DepositView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deposit' });
  return { title: t('title') };
}

export default async function DepositPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DepositView />;
}
