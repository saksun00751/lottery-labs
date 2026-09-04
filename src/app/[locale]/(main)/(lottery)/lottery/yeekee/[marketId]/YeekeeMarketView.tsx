'use client';

import { Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { YeekeeRoundGrid } from '@/components/lottery/yeekee/YeekeeRoundGrid';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useRounds } from '@/lib/api/queries';
import type { LotteryRound } from '@/types';

import styles from '../../lottery.module.scss';

export function YeekeeMarketView({ marketId }: { marketId: string }) {
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const { data, isLoading } = useRounds();
  const marketRound = (data as LotteryRound[] | undefined)?.find((r) => r.id === marketId);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={92} radius={20} />
        <Skeleton height={420} radius={20} />
      </div>
    );
  }

  if (!marketRound) {
    return <EmptyState title={tCommon('notFound')} description={tCommon('notFoundHint')} />;
  }

  return (
    <div className={styles.page}>
      <PageHeader icon={<Ticket size={22} />} title={marketRound.name} subtitle={t('chooseRound')} />
      <YeekeeRoundGrid marketRound={marketRound} />
    </div>
  );
}
