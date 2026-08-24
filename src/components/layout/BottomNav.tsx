'use client';

import { useTranslations } from 'next-intl';

import { bottomNavItems } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import styles from './AppShell.module.scss';

/** Mobile tab bar. Replaces the sidebar below the `lg` breakpoint. */
export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} aria-label={t('menu')}>
      {bottomNavItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(styles.bottomItem, active && styles.bottomActive)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={21} aria-hidden />
            <span className={styles.bottomLabel}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
