'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSelectedPackage } from '@/lib/api/queries';

import styles from './SelectedPackageCard.module.scss';

/** Mirrors lotto-seed-app's "Package ที่เลือก" card — shows the payout-rate
 * package currently active for this round's group, if any. */
export function SelectedPackageCard({ groupId }: { groupId?: number }) {
  const t = useTranslations('lottery.package');
  const { data: pkg } = useSelectedPackage(groupId);

  if (!pkg) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <Gift size={14} aria-hidden />
        <span className={styles.title}>{t('selected')}</span>
      </div>

      {pkg.imageUrl ? (
        <div className={styles.imageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pkg.imageUrl} alt={pkg.name} className={styles.image} />
        </div>
      ) : (
        <div className={styles.name}>{pkg.name || '—'}</div>
      )}
    </div>
  );
}
