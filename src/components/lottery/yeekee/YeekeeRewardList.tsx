'use client';

import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/utils/cn';
import type { YeekeeRewardWinner } from '@/types';

import styles from './YeekeeReward.module.scss';

export function YeekeeRewardList({ winners }: { winners: YeekeeRewardWinner[] }) {
  const t = useTranslations('lottery.yeekee');

  return (
    <section className={styles.panel}>
      <div className={cn(styles.header, styles.headerWinners)}>
        <h3>{t('rewardListTitle')}</h3>
        <p>{t('rewardListCount', { count: winners.length })}</p>
      </div>

      {winners.length === 0 ? (
        <EmptyState title={t('noWinners')} />
      ) : (
        <ul className={styles.list}>
          {winners.map((winner) => (
            <li key={winner.position} className={styles.row}>
              <div className={styles.left}>
                <span className={cn(styles.avatar, styles.avatarWarning)}>#{winner.position}</span>
                <div>
                  <div className={styles.number}>{winner.shoot.numberText ?? '—'}</div>
                  <div className={styles.name}>{winner.memberNamePrefixMasked}</div>
                </div>
              </div>
              <Money value={winner.creditAmount} tone="success" showSign className={styles.credit} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
