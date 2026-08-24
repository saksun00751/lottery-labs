'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/store/ui-store';

import styles from './AppShell.module.scss';
import { BottomNav } from './BottomNav';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={cn(styles.main, sidebarCollapsed && styles.mainCollapsed)}>
        <Navbar />
        <main className={styles.content}>{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
