'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/intl';
import type { Ticket, TicketStatus } from '@/types';

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
  const tTypes = useTranslations('lottery.betTypes');
  const locale = useLocale();

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.headInfo}>
          <div className={styles.roundName}>{ticket.roundName}</div>
          <div className={styles.meta}>
            {ticket.roundLabel} · {ticket.reference} ·{' '}
            {formatDateTime(ticket.createdAt, locale)}
          </div>
        </div>
        <Badge tone={STATUS_TONE[ticket.status]} dot>
          {t(`statuses.${ticket.status}`)}
        </Badge>
      </div>

      <div className={styles.items}>
        {ticket.items.map((item, index) => (
          <div key={`${item.betType}-${item.number}-${index}`} className={styles.item}>
            <span
              className={cn(
                styles.number,
                item.status === 'won' && styles.numberWon,
              )}
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

      <div className={styles.foot}>
        <div className={styles.footBlock}>
          <span className={styles.footLabel}>{t('totalStake')}</span>
          <Money value={ticket.totalStake} size="md" />
        </div>
        <div className={styles.footBlock}>
          <span className={styles.footLabel}>
            {ticket.status === 'won' ? t('statuses.won') : t('maxWin')}
          </span>
          <Money
            value={
              ticket.status === 'won'
                ? ticket.totalWin
                : ticket.items.reduce(
                    (sum, item) => sum + Math.round(item.stake * item.payout),
                    0,
                  )
            }
            size="md"
            tone={ticket.status === 'won' ? 'success' : 'muted'}
          />
        </div>
      </div>
    </article>
  );
}
