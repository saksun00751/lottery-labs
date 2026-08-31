'use client';

import { Headphones, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import { useContactChannels } from '@/lib/api/queries';

import styles from './ContactFAB.module.scss';

/**
 * Signed-out visitors on /login and /register have no other way to reach
 * support — this floats a shortcut to the guest-accessible /contact-public
 * page. Hidden once the site has no contact channels configured, or once
 * dismissed for the tab.
 */
export function ContactFAB() {
  const t = useTranslations('contact');
  const tCommon = useTranslations('common');
  const [dismissed, setDismissed] = useState(false);
  const { data, isLoading } = useContactChannels();

  if (dismissed || isLoading || (data ?? []).length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.close}
        onClick={() => setDismissed(true)}
        aria-label={tCommon('close')}
      >
        <X size={12} />
      </button>
      <Link href="/contact-public" className={styles.fab} aria-label={t('title')}>
        <Headphones size={22} aria-hidden />
      </Link>
    </div>
  );
}
