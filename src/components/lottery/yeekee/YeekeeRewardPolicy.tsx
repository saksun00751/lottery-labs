'use client';

import { useTranslations } from 'next-intl';

import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/utils/cn';
import type { YeekeeRewardTier } from '@/types';

import styles from './YeekeeReward.module.scss';

export function YeekeeRewardPolicy({ tiers }: { tiers: YeekeeRewardTier[] }) {
  const t = useTranslations('lottery.yeekee');

  return (
    <section className={styles.panel}>
      <div className={cn(styles.header, styles.headerPolicy)}>
        <h3>{t('rewardPolicyTitle')}</h3>
        <p>{t('rewardPolicySubtitle')}</p>
      </div>

      <ul className={styles.list}>
        {tiers.map((tier) => (
          <li key={tier.position} className={styles.row}>
            <div className={styles.left}>
              <span className={cn(styles.avatar, styles.avatarInfo)}>#{tier.position}</span>
              <span className={styles.label}>{tier.label}</span>
            </div>
            <Money value={tier.creditAmount} className={styles.credit} />
          </li>
        ))}
      </ul>
    </section>
  );
}
