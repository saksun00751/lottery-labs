'use client';

import { LogOut, Menu, Plus, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { authApi } from '@/lib/api/endpoints';
import { useWallet } from '@/lib/api/queries';
import { useUiStore } from '@/store/ui-store';
import type { Wallet as WalletType } from '@/types';

import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Navbar.module.scss';

export function Navbar({ siteMeta }: { siteMeta: { name: string; logo: string } }) {
  const t = useTranslations('nav');
  const openDrawer = useUiStore((s) => s.openDrawer);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { data: wallet, isLoading } = useWallet();
  const { name: siteName, logo } = siteMeta;

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    // A full navigation guarantees the proxy re-evaluates the cleared cookie.
    window.location.href = '/';
  };

  return (
    <header className={styles.navbar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={openDrawer}
        aria-label={t('menu')}
      >
        <Menu size={22} />
      </button>

      {sidebarCollapsed ? (
        <Link href="/" className={styles.brand} aria-label={siteName || 'Brand'}>
          {logo && <img src={logo} alt={siteName || 'Brand'} className={styles.brandLogo} />}
        </Link>
      ) : (
        <button
          type="button"
          className={styles.brandToggle}
          onClick={toggleSidebar}
          aria-label={t('menu')}
        >
          <Menu size={22} />
        </button>
      )}

      <div className={styles.spacer} />

      <Link href="/deposit" className={styles.balance} aria-label={t('deposit')}>
        <span className={styles.balanceIcon} aria-hidden>
          <Wallet size={17} />
        </span>
        {isLoading ? (
          <Skeleton width={72} height={15} />
        ) : (
          <Money
            value={(wallet as WalletType | undefined)?.balance ?? 0}
            size="sm"
            compact
          />
        )}
        <span className={styles.balancePlus} aria-hidden>
          <Plus size={13} strokeWidth={3} />
        </span>
      </Link>

      <div className={styles.actions}>
        <LanguageSwitcher />
        <button
          type="button"
          className={styles.iconButton}
          onClick={logout}
          aria-label={t('logout')}
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
