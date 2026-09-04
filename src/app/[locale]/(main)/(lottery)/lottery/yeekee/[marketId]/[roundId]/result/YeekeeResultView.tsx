'use client';

import { useTranslations } from 'next-intl';

import { YeekeeRewardList } from '@/components/lottery/yeekee/YeekeeRewardList';
import { YeekeeRewardPolicy } from '@/components/lottery/yeekee/YeekeeRewardPolicy';
import { YeekeeShootsList } from '@/components/lottery/yeekee/YeekeeShootsList';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useYeekeeResultProof } from '@/lib/api/queries';

import styles from './result.module.scss';

export function YeekeeResultView({ roundId }: { roundId: string }) {
  const t = useTranslations('lottery.yeekee');
  const tCommon = useTranslations('common');
  const { data: proof, isLoading } = useYeekeeResultProof(roundId);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={220} radius={20} />
        <Skeleton height={200} radius={20} />
      </div>
    );
  }

  if (!proof) {
    return <EmptyState title={tCommon('notFound')} description={tCommon('notFoundHint')} />;
  }

  const top3 = (proof.proof.resultTop3 ?? '').split('');
  const bottom2 = (proof.proof.resultBottom2 ?? '').split('');

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroLabel}>
          {t('resultTitle', { no: proof.roundNo })} · {t('provablyFair')}
        </div>
        <div className={styles.digitsRow}>
          <div>
            <div className={styles.digitGroup}>
              {top3.map((d, i) => (
                <div key={i} className={`${styles.digit} ${styles.top}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className={styles.digitCaption}>{t('top3')}</div>
          </div>
          <div>
            <div className={styles.digitGroup}>
              {bottom2.map((d, i) => (
                <div key={i} className={`${styles.digit} ${styles.bottom}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className={styles.digitCaption}>{t('bottom2')}</div>
          </div>
        </div>
        <div className={styles.proofBox}>
          <div>proof_signature: {proof.proof.proofSignature || '—'}</div>
          <div>external_seed_reference: {proof.proof.externalSeedReference || '—'}</div>
        </div>
      </div>

      <YeekeeRewardList winners={proof.winners} />
      <YeekeeRewardPolicy tiers={proof.rewardPolicy} />
      <YeekeeShootsList roundId={roundId} autoRefresh={false} />
    </div>
  );
}
