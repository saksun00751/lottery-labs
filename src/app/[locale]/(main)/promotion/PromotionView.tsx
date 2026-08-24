'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PromotionGrid } from '@/components/finance/PromotionCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { usePromotions } from '@/lib/api/queries';
import type { Promotion } from '@/types';

import styles from './promotion.module.scss';

export function PromotionView() {
  const t = useTranslations('promotion');
  const { data, isLoading } = usePromotions();
  const promotions = (data as Promotion[] | undefined) ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<Gift size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {isLoading ? (
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={340} radius={20} />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <EmptyState title={t('noPromotions')} />
      ) : (
        <PromotionGrid promotions={promotions} />
      )}
    </div>
  );
}
