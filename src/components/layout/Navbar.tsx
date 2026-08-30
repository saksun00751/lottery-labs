'use client';

import { LogOut, Menu, Plus, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Feedback';
import { Link, useRouter } from '@/i18n/navigation';
import { authApi } from '@/lib/api/endpoints';
import { useWallet } from '@/lib/api/queries';
import { useSiteMeta } from '@/lib/site-meta-client';
import { useUiStore } from '@/store/ui-store';
import type { Wallet as WalletType } from '@/types';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import styles from './Navbar.module.scss';

export function Navbar() {
  const t = useTranslations('nav');
  const openDrawer = useUiStore((s) => s.openDrawer);
  const router = useRouter();
  const { data: wallet, isLoading } = useWallet();
  const { name: siteName, logo } = useSiteMeta();

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

      <Link href="/" className={styles.brand} aria-label={siteName || 'Brand'}>
        {logo ? (
          <img src={logo} alt={siteName || 'Brand'} className={styles.brandLogo} />
        ) : (
          <span className={styles.brandMark} aria-hidden>
            LL
          </span>
        )}
      </Link>

      <div className={styles.spacer} />

      <Link href="/deposit" className={styles.balance}>
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
      </Link>

      <Button
        size="sm"
        className={styles.depositButton}
        leftIcon={<Plus size={16} />}
        onClick={() => router.push('/deposit')}
      >
        {t('deposit')}
      </Button>

      <div className={styles.actions}>
        <ThemeSwitcher />
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
