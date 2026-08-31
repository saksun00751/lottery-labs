import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/LoginForm';
import { Skeleton } from '@/components/ui/Feedback';
import { getSiteMeta } from '@/lib/site-meta';

import styles from '../auth.module.scss';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('loginTitle') };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'auth' });
  const siteMeta = await getSiteMeta();
  const siteName = siteMeta.name ?? siteMeta.site_name ?? 'Lottery Labs';
  const logo = siteMeta.logo ?? siteMeta.logo_url ?? siteMeta.logoUrl ?? '';

  return (
    <div className={styles.panel}>
      <div className={styles.brand}>
        {logo && <img src={logo} alt={siteName} className={styles.brandLogo} />}
        <span className={styles.brandName}>{siteName}</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>{t('loginTitle')}</h1>
        <p className={styles.subtitle}>{t('loginSubtitle')}</p>

        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense fallback={<Skeleton height={320} radius={14} />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
