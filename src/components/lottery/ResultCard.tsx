'use client';

import { useTranslations } from 'next-intl';

import { BET_TYPE_ORDER } from '@/lib/utils/lottery';
import type { BetTypeId, ResultMarket } from '@/types';

import styles from './ResultCard.module.scss';

export function ResultCard({
  market,
  ticketCount,
  onCheck,
}: {
  market: ResultMarket;
  ticketCount: number;
  onCheck: () => void;
}) {
  const t = useTranslations('lottery');

  const entries = BET_TYPE_ORDER.filter(
    (id) => market.numbers[id] !== undefined,
  ) as BetTypeId[];

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        {market.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={market.iconUrl} alt="" className={styles.icon} />
        )}
        <div>
          <div className={styles.name}>{market.marketName}</div>
          <div className={styles.label}>{market.drawLabel}</div>
        </div>
      </div>

      {market.hasResult ? (
        <div className={styles.numbers}>
          {entries.map((id) => (
            <div key={id} className={styles.numberGroup}>
              <span className={styles.numberLabel}>{t(`betTypes.${id}`)}</span>
              <span className={styles.numberValue}>{market.numbers[id]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.pending}>{t('results.pending')}</div>
      )}

      <button type="button" className={styles.checkButton} onClick={onCheck}>
        {t('results.checkTicket')}
        {ticketCount > 0 && <span className={styles.badge}>{ticketCount}</span>}
      </button>
    </article>
  );
}
