import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/LoginForm';
import { Skeleton } from '@/components/ui/Feedback';
import { publicEnv } from '@/config/env.public';

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

  return (
    <div className={styles.panel}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          LL
        </span>
        <span className={styles.brandName}>{publicEnv.siteName}</span>
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
