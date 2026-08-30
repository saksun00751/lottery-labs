'use client';

import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { useLaunchGame, useProviderGames } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import type { GameItem } from '@/types';

import { TYPE_EMOJI } from '../../gameMeta';
import styles from '../../games.module.scss';

/** Safari blocks a same-tick `window.open` after an awaited fetch — full navigation dodges that. */
function openGameUrl(url: string) {
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  if (isSafari) window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
}

export function ProviderGamesView({ type, providerId }: { type: string; providerId: string }) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const typeKey = type.toLowerCase();
  const emoji = TYPE_EMOJI[typeKey] ?? '🎮';
  const typeLabel = t.has(`types.${typeKey}`) ? t(`types.${typeKey}`) : type;

  const { data, isLoading } = useProviderGames(typeKey, providerId);
  const games = data ?? [];
  const launch = useLaunchGame();
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const handlePlay = async (game: GameItem) => {
    if (launchingId) return;
    setLaunchingId(game.id);
    try {
      const url = await launch.mutateAsync({ providerId, gameId: game.id });
      openGameUrl(url);
    } catch (error) {
      pushToast({
        tone: 'danger',
        title: error instanceof ApiError ? error.message : t('errCannotPlay'),
      });
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.providerCard}>
        <div className={styles.providerHeader}>
          <Link href={`/games/${typeKey}`} className={styles.backIcon} aria-label={tCommon('back')}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <p className={styles.providerType}>
              {emoji} {typeLabel}
            </p>
            <h1 className={styles.providerTitle}>{providerId.toUpperCase()}</h1>
            <p className={styles.providerCount}>
              {games.length} {t('gameCount')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton height={220} radius={0} />
        ) : games.length === 0 ? (
          <div className={styles.gameEmpty}>
            <span className={styles.gameEmptyEmoji}>{emoji}</span>
            <p>{t('noGames')}</p>
          </div>
        ) : (
          <div className={styles.gameGrid}>
            {games.map((game) => (
              <button
                key={game.id}
                type="button"
                className={styles.gameTile}
                disabled={!!launchingId}
                onClick={() => handlePlay(game)}
              >
                <span className={styles.gameTileImage}>
                  {game.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.imageUrl} alt={game.name} />
                  ) : (
                    <span aria-hidden>{emoji}</span>
                  )}
                  {launchingId === game.id && (
                    <span className={styles.playOverlay}>
                      <Loader2 size={20} color="#fff" className={styles.spin} />
                    </span>
                  )}
                </span>
                <span className={styles.gameName}>{game.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
