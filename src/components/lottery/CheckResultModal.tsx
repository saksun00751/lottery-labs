'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { Money } from '@/components/ui/Money';
import type { ResultMarket, Ticket } from '@/types';

import { STATUS_TONE } from './TicketCard';
import { TicketDetailModal } from './TicketDetailModal';
import styles from './CheckResultModal.module.scss';

/** Shown after clicking a result card — the draw's numbers plus the member's own matching slips. */
export function CheckResultModal({
  market,
  tickets,
  onClose,
}: {
  market: ResultMarket | null;
  tickets: Ticket[];
  onClose: () => void;
}) {
  const t = useTranslations('lottery');
  const tSlip = useTranslations('lottery.slip');
  const tCommon = useTranslations('common');
  const [ticketId, setTicketId] = useState<string | null>(null);

  // `Ticket.roundId` is actually the draw id (see `normalizeTicketList`).
  const matching = market?.drawId
    ? tickets.filter((ticket) => ticket.roundId === String(market.drawId))
    : [];

  return (
    <>
      <Modal
        open={market !== null}
        onClose={onClose}
        title={market?.marketName ?? ''}
        description={market?.drawLabel}
        closeLabel={tCommon('close')}
        wide
      >
        {market && (
          <>
            {market.hasResult ? (
              <div className={styles.numbers}>
                <div className={styles.numberBox}>
                  <span className={styles.numberValue}>{market.numbers['3top'] ?? '—'}</span>
                  <span className={styles.numberLabel}>{t('betTypes.3top')}</span>
                </div>
                <div className={styles.numberBox}>
                  <span className={styles.numberValue}>{market.numbers['2top'] ?? '—'}</span>
                  <span className={styles.numberLabel}>{t('betTypes.2top')}</span>
                </div>
                <div className={styles.numberBox}>
                  <span className={styles.numberValue}>{market.numbers['2bottom'] ?? '—'}</span>
                  <span className={styles.numberLabel}>{t('betTypes.2bottom')}</span>
                </div>
              </div>
            ) : (
              <p className={styles.pending}>{t('results.pending')}</p>
            )}

            {matching.length === 0 ? (
              <EmptyState title={t('results.noTicketsForDraw')} />
            ) : (
              <div className={styles.list}>
                {matching.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className={styles.row}
                    onClick={() => setTicketId(ticket.id)}
                  >
                    <div className={styles.rowInfo}>
                      <span className={styles.reference}>{ticket.reference}</span>
                      <span className={styles.meta}>
                        {tSlip('items', { count: ticket.itemCount })}
                      </span>
                    </div>
                    <Badge tone={STATUS_TONE[ticket.status]} dot>
                      {tSlip(`statuses.${ticket.status}`)}
                    </Badge>
                    <Money value={ticket.totalStake} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <TicketDetailModal ticketId={ticketId} onClose={() => setTicketId(null)} />
    </>
  );
}
