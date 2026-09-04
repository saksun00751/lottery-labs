import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { getSiteMeta } from '@/lib/site-meta';

import { ContactPublicView } from './ContactPublicView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: t('title') };
}

export default async function ContactPublicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const siteMeta = await getSiteMeta();
  const siteName = siteMeta.name ?? '';
  const logo = siteMeta.logo ?? '';

  return <ContactPublicView siteName={siteName} logo={logo} />;
}
