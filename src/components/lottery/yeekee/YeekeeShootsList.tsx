'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useYeekeeShoots } from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import type { YeekeeShoot } from '@/types';

import styles from './YeekeeShootsList.module.scss';

const HIGHLIGHT_MS = 1_200;

function maskedDisplay(shoot: YeekeeShoot): string {
  if (shoot.isRevealed && shoot.numberText) return shoot.numberText;
  return '•••••';
}

export function YeekeeShootsList({ roundId, autoRefresh = true }: { roundId: string; autoRefresh?: boolean }) {
  const t = useTranslations('lottery.yeekee');
  const { data, isLoading } = useYeekeeShoots(roundId, { autoRefresh });
  const items = data?.items ?? [];

  const seenPositions = useRef<Set<number>>(new Set());
  const hasSeenFirstLoad = useRef(false);
  const [newPositions, setNewPositions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (items.length === 0) return;

    // Don't flash every row as "new" on the first load of an in-progress
    // feed — only rows that appear *after* we've already rendered once
    // should highlight. Seed `seenPositions` silently on the first
    // non-empty render, then diff normally on every render after that.
    if (!hasSeenFirstLoad.current) {
      hasSeenFirstLoad.current = true;
      for (const it of items) seenPositions.current.add(it.position);
      return;
    }

    const fresh = items.filter((it) => !seenPositions.current.has(it.position));
    if (fresh.length === 0) return;

    const freshPositions = new Set(fresh.map((it) => it.position));
    for (const it of items) seenPositions.current.add(it.position);
    setNewPositions(freshPositions);

    const timer = setTimeout(() => setNewPositions(new Set()), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((it) => it.position).join(',')]);

  if (isLoading) {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <h3>{t('shootsListTitle')}</h3>
        </div>
        <div className={styles.body}>
          <Skeleton height={44} radius={9} />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h3>{t('shootsListTitle')}</h3>
        <p>{t('shootsListCount', { count: data?.shootCount ?? 0 })}</p>
      </div>

      {items.length === 0 ? (
        <div className={styles.body}>
          <EmptyState title={t('noShoots')} />
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((shoot) => (
            <li
              key={shoot.position}
              className={cn(styles.row, newPositions.has(shoot.position) && styles.new)}
            >
              <div className={styles.left}>
                <span className={styles.avatar}>#{shoot.position}</span>
                <div>
                  <div className={cn(styles.number, shoot.isRevealed && styles.revealed)}>
                    {maskedDisplay(shoot)}
                  </div>
                  <div className={styles.name}>{shoot.memberNamePrefixMasked || t('unnamed')}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
