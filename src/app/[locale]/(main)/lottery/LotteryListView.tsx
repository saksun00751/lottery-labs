'use client';

import { Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { RoundCard } from '@/components/lottery/RoundCard';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Tabs';
import { useRounds } from '@/lib/api/queries';
import type { LotteryCategory, LotteryRound } from '@/types';

import styles from './lottery.module.scss';

type CategoryFilter = LotteryCategory | 'all';

const CATEGORIES: CategoryFilter[] = [
  'all',
  'government',
  'yeekee',
  'hanoi',
  'laos',
  'stock',
];

export function LotteryListView() {
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const { data, isLoading } = useRounds();
  const rounds = (data as LotteryRound[] | undefined) ?? [];

  const counts = useMemo(() => {
    const map = new Map<CategoryFilter, number>([['all', rounds.length]]);
    for (const round of rounds) {
      map.set(round.category, (map.get(round.category) ?? 0) + 1);
    }
    return map;
  }, [rounds]);

  const visible =
    category === 'all' ? rounds : rounds.filter((r) => r.category === category);

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<Ticket size={22} />}
        title={t('title')}
        subtitle={t('chooseRound')}
      />

      <Tabs
        items={CATEGORIES.filter(
          (value) => value === 'all' || (counts.get(value) ?? 0) > 0,
        ).map((value) => ({
          value,
          label: t(`categories.${value}`),
          count: counts.get(value) ?? 0,
        }))}
        value={category}
        onChange={setCategory}
        ariaLabel={t('title')}
      />

      {isLoading ? (
        <div className={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={182} radius={20} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title={tCommon('noData')} />
      ) : (
        <div className={styles.grid}>
          {visible.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      )}
    </div>
  );
}
