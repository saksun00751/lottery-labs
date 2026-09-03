import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ContactFAB } from '@/components/layout/ContactFAB';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

import styles from './auth.module.scss';

export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div className={styles.topSpacer} />
        <LanguageSwitcher />
      </div>
      <div className={styles.center}>{children}</div>
      <ContactFAB />
    </div>
  );
}
