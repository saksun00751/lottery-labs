'use client';

import { Gamepad2, Grid2X2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { useGameCategories } from '@/lib/api/queries';
import type { GameCategory } from '@/types';

import { ProviderTile } from './ProviderTile';
import styles from './games.module.scss';

/** Same compact game labels used in lotto-seed-app's betting page. */
const CATEGORY_META: Record<string, { emoji: string }> = {
  SLOT: { emoji: '🎰' },
  CASINO: { emoji: '♠️' },
  SPORT: { emoji: '⚽' },
  CARDGROUP: { emoji: '🀄' },
  COCK: { emoji: '🐓' },
  FISH: { emoji: '🐟' },
};

function categoryMeta(type: string) {
  return CATEGORY_META[type] ?? { emoji: '🎮' };
}

function CategorySection({ category, t }: { category: GameCategory; t: ReturnType<typeof useTranslations<'games'>> }) {
  const { emoji } = categoryMeta(category.type);
  const typeKey = category.type.toLowerCase();
  const label = t.has(`types.${typeKey}`) ? t(`types.${typeKey}`) : category.type;

  return (
    <section id={`games-${typeKey}`} className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          {emoji} {label}
        </span>
        <Link href={`/games/${typeKey}`} className={styles.sectionViewAll}>
          {t('viewAll')} ({category.providers.length}) →
        </Link>
      </div>
      <div className={styles.slider}>
        {category.providers.map((provider) => (
          <ProviderTile key={provider.id} provider={provider} type={category.type} />
        ))}
      </div>
    </section>
  );
}

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
