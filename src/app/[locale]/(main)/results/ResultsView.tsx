'use client';

import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { ResultCard } from '@/components/lottery/ResultCard';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useResults } from '@/lib/api/queries';
import type { DrawResult } from '@/types';

import styles from './results.module.scss';

export function ResultsView() {
  const t = useTranslations('lottery.results');
  const { data, isLoading } = useResults();
  const results = (data as DrawResult[] | undefined) ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<Trophy size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {isLoading ? (
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={196} radius={20} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState title={t('noResults')} />
      ) : (
        <div className={styles.grid}>
          {results.map((result) => (
            <ResultCard key={`${result.roundId}-${result.drawnAt}`} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
