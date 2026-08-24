import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { publicEnv } from '@/config/env.public';

import { ReferralView } from './ReferralView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'referral' });
  return { title: t('title') };
}

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The feature flag hides the route entirely, not just the nav entry.
  if (!publicEnv.features.referral) notFound();

  return <ReferralView />;
}
