'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { WalletSummary } from '@/components/home/WalletSummary';
import { gamesEnabled, lotteryEnabled } from '@/config/site-mode';
import { cn } from '@/lib/utils/cn';

import { GamesHomeSection } from './GamesHomeSection';
import { LotteryHomeSection } from './LotteryHomeSection';
import styles from './home.module.scss';

type HomeTab = 'lottery' | 'games';

export function HomeView() {
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<HomeTab>('lottery');

  const showTabs = lotteryEnabled && gamesEnabled;

  return (
    <div className={styles.page}>
      <WalletSummary />

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
