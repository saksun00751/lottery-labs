'use client';

import { useTranslations } from 'next-intl';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useGameCategories } from '@/lib/api/queries';

import { CategorySection } from './games/CategorySection';
import gamesStyles from './games/games.module.scss';

export function GamesHomeSection() {
  const t = useTranslations('games');
  const { data, isLoading, isError } = useGameCategories();
  const categories = data ?? [];

  if (isLoading) {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={190} radius={16} />
        ))}
      </>
    );
  }

  if (isError || categories.length === 0) {
    return <EmptyState title={t('noProviders')} />;
  }

  return (
    <div className={gamesStyles.sections}>
      {categories.map((category) => (
        <CategorySection key={category.type} category={category} t={t} />
      ))}
    </div>
  );
}
