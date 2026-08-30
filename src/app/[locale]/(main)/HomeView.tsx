'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  Gift,
  History,
  ScrollText,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { WalletSummary } from '@/components/home/WalletSummary';
import { publicEnv } from '@/config/env.public';
import { gamesEnabled, lotteryEnabled } from '@/config/site-mode';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import { GamesHomeSection } from './GamesHomeSection';
import { LotteryHomeSection } from './LotteryHomeSection';
import { SectionHead } from './SectionHead';
import styles from './home.module.scss';

interface QuickAction {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  enabled?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { href: '/deposit', labelKey: 'deposit', icon: ArrowDownToLine },
  { href: '/withdraw', labelKey: 'withdraw', icon: ArrowUpFromLine },
  { href: '/lottery', labelKey: 'lottery', icon: Ticket, enabled: lotteryEnabled },
  { href: '/slip', labelKey: 'slip', icon: ScrollText, enabled: lotteryEnabled },
  { href: '/results', labelKey: 'results', icon: Trophy, enabled: lotteryEnabled },
  { href: '/games', labelKey: 'games', icon: Gamepad2, enabled: gamesEnabled },
  { href: '/history', labelKey: 'history', icon: History },
  {
    href: '/promotion',
    labelKey: 'promotion',
    icon: Gift,
    enabled: publicEnv.features.promotion,
  },
  {
    href: '/referral',
    labelKey: 'referral',
    icon: Users,
    enabled: publicEnv.features.referral,
  },
];

type HomeTab = 'lottery' | 'games';

export function HomeView() {
  const t = useTranslations('home');
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<HomeTab>('lottery');

  const actions = QUICK_ACTIONS.filter((action) => action.enabled !== false);
  const showTabs = lotteryEnabled && gamesEnabled;

  return (
    <div className={styles.page}>
      <WalletSummary />

      <section className={styles.section}>
        <SectionHead icon={Ticket} title={t('quickActions')} />
        <div className={styles.quickGrid}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className={styles.quickItem}>
                <span className={styles.quickIcon} aria-hidden>
                  <Icon size={20} />
                </span>
                <span className={styles.quickLabel}>{tNav(action.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {showTabs ? (
        <>
          <div className={styles.homeTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'lottery'}
              className={cn(styles.homeTab, tab === 'lottery' && styles.homeTabActive)}
              onClick={() => setTab('lottery')}
            >
              {tNav('lottery')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'games'}
              className={cn(styles.homeTab, tab === 'games' && styles.homeTabActive)}
              onClick={() => setTab('games')}
            >
              {tNav('games')}
            </button>
          </div>
          {tab === 'lottery' ? <LotteryHomeSection /> : <GamesHomeSection />}
        </>
      ) : lotteryEnabled ? (
        <LotteryHomeSection />
      ) : (
        <GamesHomeSection />
      )}
    </div>
  );
}
