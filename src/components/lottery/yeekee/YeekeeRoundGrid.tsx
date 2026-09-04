'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useYeekeeRounds } from '@/lib/api/queries';
import type { LotteryRound, YeekeeRound } from '@/types';

import { YeekeeRoundDetail } from './YeekeeRoundDetail';
import styles from './YeekeeRoundGrid.module.scss';

function roundState(round: YeekeeRound): 'live' | 'done' | 'upcoming' {
  if (round.isFinal) return 'done';
  if (round.isOpenForPlay) return 'live';
  return 'upcoming';
}

export function YeekeeRoundGrid({ marketRound }: { marketRound: LotteryRound }) {
  const t = useTranslations('lottery.yeekee');
  const { data, isLoading } = useYeekeeRounds(marketRound.id);
  const rounds = data ?? [];

  const defaultSelected = useMemo(
    () => rounds.find((r) => r.isOpenForPlay)?.id ?? rounds[0]?.id ?? null,
    [rounds],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? defaultSelected;
  const activeRound = rounds.find((r) => r.id === activeId) ?? null;

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} height={64} radius={11} />
        ))}
      </div>
    );
  }

  if (rounds.length === 0) {
    return <EmptyState title={t('noRounds')} />;
  }

  return (
    <div>
      <div className={styles.grid}>
        {rounds.map((round) => (
          <button
            key={round.id}
            type="button"
            className={styles.roundBtn}
            data-state={roundState(round)}
            data-selected={round.id === activeId || undefined}
            onClick={() => setSelectedId(round.id)}
          >
            {round.roundNo}
            <small>{t(`state.${roundState(round)}`)}</small>
          </button>
        ))}
      </div>

      {activeRound && <YeekeeRoundDetail round={activeRound} marketRound={marketRound} />}
    </div>
  );
}
