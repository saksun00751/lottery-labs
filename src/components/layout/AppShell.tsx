'use client';

import { useEffect, type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/store/ui-store';

import styles from './AppShell.module.scss';
import { BottomNav } from './BottomNav';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

/**
 * Below this, the fixed 268px rail eats too much of a laptop's content
 * width (see the betting-page layout review) — collapse to the icon rail
 * by default. Wide monitors (≥1440px) keep the full labelled sidebar.
 */
const LAPTOP_MAX_WIDTH = 1439;

export function AppShell({
  children,
  siteMeta,
}: {
  children: ReactNode;
  siteMeta: { name: string; logo: string };
}) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${LAPTOP_MAX_WIDTH}px)`);
    const apply = (e: MediaQueryList | MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [setSidebarCollapsed]);

  return (
    <div className={styles.shell}>
      <Sidebar siteMeta={siteMeta} />
      <div className={cn(styles.main, sidebarCollapsed && styles.mainCollapsed)}>
        <Navbar siteMeta={siteMeta} />
        <main className={styles.content}>{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
