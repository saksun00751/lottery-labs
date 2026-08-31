import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { getSiteMeta } from '@/lib/site-meta';

export default async function MainLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const siteMeta = await getSiteMeta();
  const siteName = siteMeta.name ?? siteMeta.site_name ?? '';
  const logo = siteMeta.logo ?? siteMeta.logo_url ?? siteMeta.logoUrl ?? '';

  return <AppShell siteMeta={{ name: siteName, logo }}>{children}</AppShell>;
}
