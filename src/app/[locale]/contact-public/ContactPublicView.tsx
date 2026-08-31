'use client';

import { Headphones, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ContactChannels } from '@/components/contact/ContactChannels';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { Link } from '@/i18n/navigation';

import authStyles from '../(auth)/auth.module.scss';
import styles from './contact-public.module.scss';

export function ContactPublicView({ siteName, logo }: { siteName: string; logo: string }) {
  const t = useTranslations('contact');
  const tNav = useTranslations('nav');

  return (
    <div className={authStyles.wrap}>
      <div className={authStyles.topBar}>
        <div className={authStyles.topSpacer} />
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <div className={styles.center}>
        <div className={styles.panel}>
          <div className={authStyles.brand}>
            {logo && <img src={logo} alt={siteName} className={authStyles.brandLogo} />}
            <span className={authStyles.brandName}>{siteName}</span>
          </div>

          <div className={authStyles.card}>
            <div className={styles.head}>
              <div>
                <h1 className={authStyles.title}>
                  <Headphones size={20} aria-hidden className={styles.titleIcon} />
                  {t('title')}
                </h1>
                <p className={authStyles.subtitle}>{t('subtitle')}</p>
              </div>
              <Link href="/login" className={styles.loginLink}>
                <LogIn size={15} aria-hidden />
                {tNav('login')}
              </Link>
            </div>

            <ContactChannels />
          </div>
        </div>
      </div>
    </div>
  );
}
