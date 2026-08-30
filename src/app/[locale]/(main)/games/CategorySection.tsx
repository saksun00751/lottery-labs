'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
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

export function categoryMeta(type: string) {
  return CATEGORY_META[type] ?? { emoji: '🎮' };
}

export function CategorySection({
  category,
  t,
}: {
  category: GameCategory;
  t: ReturnType<typeof useTranslations<'games'>>;
}) {
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
