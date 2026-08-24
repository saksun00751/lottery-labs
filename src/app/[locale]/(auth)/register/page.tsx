import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { publicEnv } from '@/config/env.public';

import styles from '../auth.module.scss';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('registerTitle') };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className={`${styles.panel} ${styles.wide}`}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          LL
        </span>
        <span className={styles.brandName}>{publicEnv.siteName}</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>{t('registerTitle')}</h1>
        <p className={styles.subtitle}>{t('registerSubtitle')}</p>
        <RegisterForm />
      </div>
    </div>
  );
}
