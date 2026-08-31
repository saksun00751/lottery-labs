import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { getSiteMeta } from '@/lib/site-meta';

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
  const siteMeta = await getSiteMeta();
  const siteName = siteMeta.name ?? siteMeta.site_name ?? '';
  const logo = siteMeta.logo ?? siteMeta.logo_url ?? siteMeta.logoUrl ?? '';

  return (
    <div className={`${styles.panel} ${styles.wide}`}>
      <div className={styles.brand}>
        {logo && <img src={logo} alt={siteName} className={styles.brandLogo} />}
        <span className={styles.brandName}>{siteName}</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>{t('registerTitle')}</h1>
        <p className={styles.subtitle}>{t('registerSubtitle')}</p>
        <RegisterForm />
      </div>
    </div>
  );
}
