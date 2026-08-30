'use client';

import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import type { GameProvider } from '@/types';

import styles from './games.module.scss';

/**
 * Some provider logos 404 on the backend's storage (confirmed live — `naturalWidth`
 * stays 0 after load) — falls back to the provider's initial instead of the
 * browser's broken-image glyph, which otherwise floats at a tiny fixed size and
 * makes that one tile look mis-scaled next to every other tile.
 */
export function ProviderTile({ provider, type }: { provider: GameProvider; type: string }) {
  const [broken, setBroken] = useState(false);

  return (
    <Link href={`/games/${type.toLowerCase()}/${provider.id.toLowerCase()}`} className={styles.tile}>
      <span className={styles.tileImage}>
        {provider.imageUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={provider.imageUrl} alt={provider.name} onError={() => setBroken(true)} />
        ) : (
          <span aria-hidden>{provider.name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className={styles.tileName}>{provider.name}</span>
    </Link>
  );
}
