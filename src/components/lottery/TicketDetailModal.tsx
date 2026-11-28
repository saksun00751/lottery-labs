'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { useCancelTicket, useHanoiResults, useTicketDetail } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import { bangkokToday } from '@/lib/utils/bangkok-time';
import { cn } from '@/lib/utils/cn';

import { HanoiResultTable } from './HanoiResultTable';
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
  const tHanoi = useTranslations('lottery.hanoi');
  const tResults = useTranslations('lottery.results');
  const tCommon = useTranslations('common');

  const { data: ticket, isLoading } = useTicketDetail(ticketId ?? undefined);
  const cancelTicket = useCancelTicket();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hanoiDate =
    ticketId && ticket?.items.some((item) => item.hanoi) ? (ticket.drawDate ?? null) : null;
  const hanoiQuery = useHanoiResults(hanoiDate, hanoiDate === bangkokToday());
  // Matched by draw id, so another draw's numbers can never show up against this slip.
  const draw = hanoiDate
    ? hanoiQuery.data?.find((round) => String(round.drawId) === ticket?.roundId)
    : undefined;

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
            {draw && (
              <div className={styles.result}>
                {draw.hanoi ? (
                  <HanoiResultTable result={draw.hanoi} />
                ) : (
                  <p className={styles.pending}>{tResults(draw.emptyReason ?? 'pending')}</p>
                )}
              </div>
            )}

            <div className={styles.items}>
              {ticket.items.map((item, index) => (
                <div key={`${item.betType}-${item.number}-${index}`} className={styles.item}>
                  <span
                    className={cn(styles.number, item.status === 'won' && styles.numberWon)}
                  >
                    {item.number}
                  </span>
                  <div className={styles.itemInfo}>
                    {item.hanoi ? (
                      <>
                        <div className={styles.itemType}>
                          {/* `hanoi_a2` is channel A, 2 digits — not position A2. */}
                          {item.betType.charAt(6).toUpperCase()} ·{' '}
                          {tHanoi('digitsValue', { count: Number(item.betType.charAt(7)) })}
                          {item.betType.charAt(6) === 'a' &&
                            item.hanoi.position !== undefined &&
                            ` · ${
                              item.hanoi.position === null
                                ? tHanoi('ticket.allPositions')
                                : `A${item.hanoi.position}`
                            }`}
                          {' · '}
                          {tHanoi(`methods.${item.hanoi.method}`)}
                          {item.hanoi.method !== 'straight' && ` ${item.hanoi.source}`}
                        </div>
                        <div className={styles.itemRate}>
                          {tHanoi('slip.units', { count: item.hanoi.unitCount })} × {item.hanoi.unitAmount} · × {item.payout}
                          {item.hanoi.matchedUnits !== undefined &&
                            ` · ${tHanoi('ticket.matched', { count: item.hanoi.matchedUnits })}`}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.itemType}>{tTypes(item.betType)}</div>
                        <div className={styles.itemRate}>× {item.payout}</div>
                      </>
                    )}
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
