'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import type { BetType, BetTypeId } from '@/types';

import styles from './BetTypeGrid.module.scss';

export function BetTypeGrid({
  types,
  value,
  onToggle,
}: {
  types: BetType[];
  /** Every currently-checked id — always within a single group (3-digit / 2-digit / run) at a time. */
  value: BetTypeId[];
  onToggle: (id: BetTypeId) => void;
}) {
  const t = useTranslations('lottery');

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span>{t('board.betTypeTitle')}</span>
        {value.length === 0 && <span className={styles.hint}>{t('board.pickAtLeastOne')}</span>}
      </div>
      <div className={styles.grid}>
        {types.map((type) => {
          const active = value.includes(type.id);
          return (
            <button
              key={type.id}
              type="button"
              className={cn(styles.chip, active && styles.active)}
              onClick={() => onToggle(type.id)}
              aria-pressed={active}
            >
              <span className={styles.label}>{t(`betTypes.${type.id}`)}</span>
              <span className={styles.payout}>× {type.payout}</span>
              {active && (
                <span className={styles.check} aria-hidden>
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
