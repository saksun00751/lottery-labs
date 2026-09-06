'use client';

import { Headphones, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { hasAuthFlagCookie } from '@/lib/auth-cookie';
import { useContactChannels } from '@/lib/api/queries';

import styles from './ContactFAB.module.scss';

// /login and /register have no other way to reach support, so the FAB stays
// visible there at every viewport size instead of hiding on mobile.
const ALWAYS_VISIBLE_PATHS = ['/login', '/register'];

/**
 * Floats a shortcut to support on every page (hidden on mobile viewports,
 * where the bottom nav already owns that space, except on /login and
 * /register). Signed-in members go to the full /contact page; signed-out
 * visitors go to the guest-accessible /contact-public page — checked via the
 * readable auth flag cookie rather than `useMe()`, which would 401 and
 * bounce guests to /login. Hidden once the site has no contact channels
 * configured, or once dismissed for the tab.
 */
export function ContactFAB() {
  const t = useTranslations('contact');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const { data, isLoading } = useContactChannels();

  useEffect(() => {
    setIsAuthed(hasAuthFlagCookie());
  }, []);

  if (dismissed || isLoading || (data ?? []).length === 0) return null;

  const alwaysVisible = ALWAYS_VISIBLE_PATHS.includes(pathname);

  return (
    <div className={alwaysVisible ? `${styles.wrap} ${styles.alwaysVisible}` : styles.wrap}>
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
