'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { useGameProviders } from '@/lib/api/queries';

import { TYPE_EMOJI } from '../gameMeta';
import styles from '../games.module.scss';
import { ProviderTile } from '../ProviderTile';

const CARD_GROUP_TYPES = ['card', 'poker', 'keno'];

export function GameTypeView({ type }: { type: string }) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const typeKey = type.toLowerCase();
  const isCardGroup = typeKey === 'cardgroup';
  const emoji = TYPE_EMOJI[typeKey] ?? '🎮';

  const { data, isLoading } = useGameProviders(typeKey);
  const providers = data ?? [];

  const groups = useMemo(() => {
    if (!isCardGroup) return null;
    return CARD_GROUP_TYPES.map((sub) => ({
      type: sub,
      providers: providers.filter((p) => p.gameType === sub),
    })).filter((group) => group.providers.length > 0);
  }, [isCardGroup, providers]);

  const label = t.has(`types.${typeKey}`) ? t(`types.${typeKey}`) : type;

  return (
    <div className={styles.page}>
      <div className={styles.typeCard}>
        <div className={styles.typeHeader}>
          <Link href="/games" className={styles.backIcon} aria-label={tCommon('back')}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className={styles.typeTitle}>
              {emoji} {label}
            </h1>
            <p className={styles.typeCount}>
              {providers.length} {t('providersCount')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton height={220} radius={0} />
        ) : providers.length === 0 ? (
          <div className={styles.gameEmpty}>
            <span className={styles.gameEmptyEmoji}>{emoji}</span>
            <p>{t('noProviders')}</p>
          </div>
        ) : groups ? (
          <div className={styles.groupList}>
            {groups.map((group) => (
              <section key={group.type} className={styles.groupSection}>
                <div className={styles.groupHeader}>
                  {TYPE_EMOJI[group.type]}{' '}
                  {t.has(`types.${group.type}`) ? t(`types.${group.type}`) : group.type}
                  <span className={styles.groupCount}>
                    &nbsp;· {group.providers.length} {t('providersCount')}
                  </span>
                </div>
                <div className={styles.grid}>
                  {group.providers.map((provider) => (
                    <ProviderTile key={provider.id} provider={provider} type={typeKey} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {providers.map((provider) => (
              <ProviderTile key={provider.id} provider={provider} type={typeKey} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
