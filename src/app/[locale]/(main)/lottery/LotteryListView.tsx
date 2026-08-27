'use client';

import { Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { PackagePickerModal } from '@/components/lottery/PackagePickerModal';
import { RoundCard } from '@/components/lottery/RoundCard';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Tabs';
import { useRounds } from '@/lib/api/queries';
import { useRoundPicker } from '@/lib/hooks/use-round-picker';
import { isBettable } from '@/lib/utils/lottery';
import type { LotteryRound } from '@/types';

import styles from './lottery.module.scss';

/** The real backend group code when present, otherwise the coarse `category` (mock data has no group code). */
function groupKey(round: LotteryRound): string {
  return round.groupCode ?? round.category;
}

/** เปิดรับ (open/closing) first, then closed, then already-settled. */
function statusOrder(round: LotteryRound): number {
  if (isBettable(round.status)) return 0;
  return round.status === 'closed' ? 1 : 2;
}

export function LotteryListView() {
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const groupParam = searchParams.get('group') ?? searchParams.get('category');

  const { data, isLoading } = useRounds();
  const rounds = (data as LotteryRound[] | undefined) ?? [];

  const tabs = useMemo(() => {
    const seen = new Map<string, { label: string; count: number }>();
    for (const round of rounds) {
      const key = groupKey(round);
      const existing = seen.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        seen.set(key, {
          label: round.groupName || t(`categories.${round.category}`),
          count: 1,
        });
      }
    }
    return [
      { value: 'all', label: t('categories.all'), count: rounds.length },
      ...Array.from(seen, ([value, { label, count }]) => ({ value, label, count })),
    ];
  }, [rounds, t]);

  const [category, setCategory] = useState<string>(groupParam ?? 'all');
  const { play, checkingId, pickerRound, closePicker } = useRoundPicker();

  const visible = useMemo(() => {
    const filtered =
      category === 'all' ? rounds : rounds.filter((r) => groupKey(r) === category);
    return [...filtered].sort((a, b) => statusOrder(a) - statusOrder(b));
  }, [rounds, category]);

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<Ticket size={22} />}
        title={t('title')}
        subtitle={t('chooseRound')}
      />

      <Tabs
        items={tabs}
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
            <RoundCard
              key={round.id}
              round={round}
              onPlay={play}
              loading={checkingId === round.id}
            />
          ))}
        </div>
      )}

      <PackagePickerModal round={pickerRound} onClose={closePicker} />
    </div>
  );
}
