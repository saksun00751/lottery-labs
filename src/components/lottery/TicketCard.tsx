'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Money } from '@/components/ui/Money';
import { formatDateTime } from '@/lib/utils/intl';
import type { Ticket, TicketStatus } from '@/types';

import { TicketDetailModal } from './TicketDetailModal';
import styles from './TicketCard.module.scss';

const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  pending: 'warning',
  won: 'success',
  lost: 'neutral',
  void: 'neutral',
  refunded: 'info',
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const t = useTranslations('lottery.slip');
  const locale = useLocale();
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <article className={styles.card}>
        <button
          type="button"
          className={styles.head}
          onClick={() => setDetailOpen(true)}
        >
          <div className={styles.headInfo}>
            <div className={styles.roundName}>{ticket.roundName}</div>
            <div className={styles.meta}>
              {ticket.reference} · {formatDateTime(ticket.createdAt, locale)}
            </div>
          </div>
          <Badge tone={STATUS_TONE[ticket.status]} dot>
            {t(`statuses.${ticket.status}`)}
          </Badge>
          <ChevronRight size={18} className={styles.chevron} aria-hidden />
        </button>

        <div className={styles.foot}>
          <div className={styles.footBlock}>
            <span className={styles.footLabel}>{t('items', { count: ticket.itemCount })}</span>
          </div>
          <div className={styles.footBlock}>
            <span className={styles.footLabel}>{t('totalStake')}</span>
            <Money value={ticket.totalStake} size="md" />
          </div>
          {ticket.status === 'won' && (
            <div className={styles.footBlock}>
              <span className={styles.footLabel}>{t('statuses.won')}</span>
              <Money value={ticket.totalWin} size="md" tone="success" showSign />
            </div>
          )}
        </div>
      </article>

      <TicketDetailModal
        ticketId={detailOpen ? ticket.id : null}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}
