'use client';

import { Gamepad2, Grid2X2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useGameCategories } from '@/lib/api/queries';

import { CategorySection, categoryMeta } from './CategorySection';
import styles from './games.module.scss';

export function GamesView() {
  const t = useTranslations('games');

  const { data, isLoading, isError } = useGameCategories();
  const categories = data ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.betBanner}>
        <span className={styles.bannerIcon} aria-hidden>
          <Gamepad2 size={22} />
        </span>
        <div className={styles.bannerCopy}>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        {!isLoading && categories.length > 0 && (
          <span className={styles.bannerCount}>
            <Grid2X2 size={14} aria-hidden />
            {categories.length}
          </span>
        )}
      </header>

      {isLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={190} radius={16} />
          ))}
        </>
      ) : isError || categories.length === 0 ? (
        <EmptyState title={t('noProviders')} />
      ) : (
        <>
          <nav className={styles.categoryTabs} aria-label={t('title')}>
            {categories.map((category) => {
              const typeKey = category.type.toLowerCase();
              const label = t.has(`types.${typeKey}`) ? t(`types.${typeKey}`) : category.type;
              return (
                <a key={category.type} href={`#games-${typeKey}`} className={styles.categoryTab}>
                  <span aria-hidden>{categoryMeta(category.type).emoji}</span>
                  {label}
                </a>
              );
            })}
          </nav>
          <div className={styles.sections}>
            {categories.map((category) => (
              <CategorySection key={category.type} category={category} t={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
