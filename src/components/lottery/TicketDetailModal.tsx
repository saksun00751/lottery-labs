'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { useCancelTicket, useTicketDetail } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/utils/cn';

import styles from './TicketDetailModal.module.scss';

export function TicketDetailModal({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations('lottery.slip');
  const tTypes = useTranslations('lottery.betTypes');
  const tCommon = useTranslations('common');

  const { data: ticket, isLoading } = useTicketDetail(ticketId ?? undefined);
  const cancelTicket = useCancelTicket();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onCancel = () => {
    if (!ticketId) return;
    cancelTicket.mutate(ticketId, {
      onSuccess: () => {
        setConfirmOpen(false);
        pushToast({ tone: 'success', title: t('cancelSuccess') });
        onClose();
      },
      onError: (error) => {
        pushToast({
          tone: 'danger',
          title: error instanceof ApiError ? error.message : tCommon('error'),
          description: error instanceof ApiError ? undefined : tCommon('errorHint'),
        });
      },
    });
  };

  return (
    <>
      <Modal
        open={ticketId !== null}
        onClose={onClose}
        title={ticket ? ticket.roundName : t('title')}
        description={ticket?.reference}
        closeLabel={tCommon('close')}
        wide
        footer={
          ticket?.status === 'pending' ? (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              {t('cancelTicket')}
            </Button>
          ) : undefined
        }
      >
        {isLoading || !ticket ? (
          <div className={styles.loading}>
            <Skeleton height={44} radius={10} />
            <Skeleton height={44} radius={10} />
            <Skeleton height={44} radius={10} />
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {ticket.items.map((item, index) => (
                <div key={`${item.betType}-${item.number}-${index}`} className={styles.item}>
                  <span
                    className={cn(styles.number, item.status === 'won' && styles.numberWon)}
                  >
                    {item.number}
                  </span>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemType}>{tTypes(item.betType)}</div>
                    <div className={styles.itemRate}>× {item.payout}</div>
                  </div>
                  <div className={styles.itemAmounts}>
                    <Money value={item.stake} size="sm" tone="muted" />
                    {item.winAmount > 0 && (
                      <Money value={item.winAmount} size="sm" tone="success" showSign />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>{t('totalStake')}</span>
                <Money value={ticket.totalStake} size="sm" />
              </div>
              {ticket.totalDiscount > 0 && (
                <div className={styles.summaryRow}>
                  <span>{t('totalDiscount')}</span>
                  <Money value={ticket.totalDiscount} size="sm" tone="muted" />
                </div>
              )}
              <div className={cn(styles.summaryRow, styles.summaryTotal)}>
                <span>{t('totalWin')}</span>
                <Money
                  value={ticket.totalWin}
                  size="md"
                  tone={ticket.totalWin > 0 ? 'success' : 'muted'}
                />
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('cancelConfirmTitle')}
        description={t('cancelConfirmHint')}
        closeLabel={tCommon('close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="danger" loading={cancelTicket.isPending} onClick={onCancel}>
              {tCommon('confirm')}
            </Button>
          </>
        }
      />
    </>
  );
}
