'use client';

import { Headphones, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { hasAuthFlagCookie } from '@/lib/auth-cookie';
import { useContactChannels } from '@/lib/api/queries';

import styles from './ContactFAB.module.scss';

/**
 * Floats a shortcut to support on every page (hidden on mobile viewports,
 * where the bottom nav already owns that space). Signed-in members go to the
 * full /contact page; signed-out visitors go to the guest-accessible
 * /contact-public page — checked via the readable auth flag cookie rather
 * than `useMe()`, which would 401 and bounce guests to /login. Hidden once
 * the site has no contact channels configured, or once dismissed for the tab.
 */
export function ContactFAB() {
  const t = useTranslations('contact');
  const tCommon = useTranslations('common');
  const [dismissed, setDismissed] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const { data, isLoading } = useContactChannels();

  useEffect(() => {
    setIsAuthed(hasAuthFlagCookie());
  }, []);

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
      <Link
        href={isAuthed ? '/contact' : '/contact-public'}
        className={styles.fab}
        aria-label={t('title')}
      >
        <Headphones size={22} aria-hidden />
      </Link>
    </div>
  );
}
