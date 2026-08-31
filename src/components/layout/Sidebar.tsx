'use client';

import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { visibleNavSections } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/store/ui-store';

import styles from './AppShell.module.scss';

export function Sidebar({ siteMeta }: { siteMeta: { name: string; logo: string } }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { sidebarCollapsed, drawerOpen, closeDrawer, toggleSidebar } = useUiStore();
  const { name: siteName, logo } = siteMeta;

  // Any navigation closes the mobile drawer — otherwise it covers the new page.
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (drawerOpen) document.body.dataset.scrollLocked = 'true';
    else delete document.body.dataset.scrollLocked;
  }, [drawerOpen]);

  // Only the most specific matching link should light up — otherwise a
  // sub-page like /lottery/today also activates its parent /lottery link.
  const activeHref = visibleNavSections
    .flatMap((section) => section.items.map((item) => item.href))
    .filter((href) =>
      href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (href: string) => href === activeHref;

  return (
    <>
      {drawerOpen && (
        <div className={styles.overlay} onClick={closeDrawer} aria-hidden />
      )}

      <aside
        className={cn(
          styles.sidebar,
          sidebarCollapsed && styles.collapsed,
          drawerOpen && styles.sidebarOpen,
        )}
      >
        <div className={styles.brand}>
          {logo && <img src={logo} alt={siteName || 'Brand'} className={styles.brandLogo} />}
          <button
            type="button"
            className={styles.brandToggle}
            onClick={toggleSidebar}
            aria-label={t('menu')}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {visibleNavSections.map((section, index) => (
            <div key={section.titleKey ?? `section-${index}`} className={styles.section}>
              {section.titleKey && (
                <div className={styles.sectionTitle}>{t(section.titleKey)}</div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.navLink}
                      title={t(item.labelKey)}
                    >
                      <span className={styles.navIcon} aria-hidden>
                        <Icon size={19} />
                      </span>
                      <span className={styles.navLabel}>{t(item.labelKey)}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(styles.navLink, active && styles.navActive)}
                    aria-current={active ? 'page' : undefined}
                    title={t(item.labelKey)}
                  >
                    <span className={styles.navIcon} aria-hidden>
                      <Icon size={19} />
                    </span>
                    <span className={styles.navLabel}>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.collapseToggle}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <>
                <PanelLeftClose size={18} />
                <span className={styles.navLabel}>{t('menu')}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
