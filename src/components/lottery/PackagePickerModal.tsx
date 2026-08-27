'use client';

import { Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from '@/i18n/navigation';
import { usePackages, useSelectPackage } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import type { LotteryRound } from '@/types';

import styles from './PackagePickerModal.module.scss';

/**
 * Gate shown before entering a bet page — pick a payout-rate package for the
 * round's group, matching lotto-seed-app's `PackageModalButton` flow. The
 * selection is stored server-side against the group, so `BetView` re-reads
 * it (via `useSelectedPackage`) rather than carrying the id through the URL.
 */
export function PackagePickerModal({
  round,
  onClose,
}: {
  round: LotteryRound | null;
  onClose: () => void;
}) {
  const t = useTranslations('lottery.package');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const groupId = round?.groupId;
  const { data, isLoading } = usePackages(groupId);
  const select = useSelectPackage();
  const packages = data ?? [];

  const handlePick = (packageId: number) => {
    if (!groupId || !round) return;
    select.mutate(
      { groupId, packageId },
      {
        onSuccess: () => {
          onClose();
          router.push(`/lottery/${round.id}`);
        },
        onError: () => {
          pushToast({ tone: 'danger', title: tCommon('error'), description: tCommon('errorHint') });
        },
      },
    );
  };

  return (
    <Modal
      open={!!round}
      onClose={onClose}
      title={t('title')}
      description={round?.name}
      closeLabel={tCommon('close')}
    >
      {isLoading ? (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={140} radius={16} />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              className={styles.card}
              disabled={select.isPending}
              onClick={() => handlePick(pkg.id)}
            >
              {pkg.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pkg.imageUrl} alt={pkg.name} className={styles.image} />
              ) : (
                <span className={styles.fallback} aria-hidden>
                  <Ticket size={28} />
                </span>
              )}
              {pkg.name && <span className={styles.name}>{pkg.name}</span>}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
