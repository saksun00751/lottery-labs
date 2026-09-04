'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import { enabledLocales, localeMeta, type Locale } from '@/i18n/routing';
import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { cn } from '@/lib/utils/cn';

import styles from './Navbar.module.scss';

export function LanguageSwitcher() {
  const t = useTranslations('settings');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const change = (next: Locale) => {
    setOpen(false);
    startTransition(() => {
      // `pathname` already has dynamic segments resolved, so /lottery/<id>
      // survives the swap.
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div className={styles.popWrap} ref={ref}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t('language')}
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.flag} aria-hidden>
          {localeMeta[locale].flag}
        </span>
      </button>

      {open && (
        <div className={styles.pop} role="menu">
          <div className={styles.popTitle}>{t('language')}</div>
          {enabledLocales.map((code) => {
            const meta = localeMeta[code];
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={code === locale}
                className={cn(styles.popItem, code === locale && styles.popItemActive)}
                onClick={() => change(code)}
              >
                <span className={styles.flag} aria-hidden>
                  {meta.flag}
                </span>
                <span style={{ fontFamily: meta.fontVar }}>{meta.native}</span>
                {code === locale && (
                  <span className={styles.check}>
                    <Check size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
