'use client';

import { CalendarCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDateTime } from '@/lib/utils/intl';
import { BET_TYPE_ORDER } from '@/lib/utils/lottery';
import type { BetTypeId, DrawResult } from '@/types';

import styles from './ResultCard.module.scss';

export function ResultCard({ result }: { result: DrawResult }) {
  const t = useTranslations('lottery');
  const locale = useLocale();

  const entries = BET_TYPE_ORDER.filter(
    (id) => result.numbers[id] !== undefined,
  ) as BetTypeId[];

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.name}>{result.roundName}</div>
          <div className={styles.label}>{result.roundLabel}</div>
        </div>
      </div>

      <div className={styles.numbers}>
        {entries.map((id) => (
          <div key={id} className={styles.numberGroup}>
            <span className={styles.numberLabel}>{t(`betTypes.${id}`)}</span>
            <span className={styles.numberValue}>{result.numbers[id]}</span>
          </div>
        ))}
      </div>

      <div className={styles.time}>
        <CalendarCheck size={14} aria-hidden />
        {t('results.drawnAt', { time: formatDateTime(result.drawnAt, locale) })}
      </div>
    </article>
  );
}
