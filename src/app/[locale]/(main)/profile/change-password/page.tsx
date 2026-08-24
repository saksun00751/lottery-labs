import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { ChangePasswordView } from './ChangePasswordView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });
  return { title: t('changePasswordTitle') };
}

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChangePasswordView />;
}
