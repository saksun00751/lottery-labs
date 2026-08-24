'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  History as HistoryIcon,
  RotateCcw,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { Tabs } from '@/components/ui/Tabs';
import { useTransactions } from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/intl';
import type {
  Paginated,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@/types';

import styles from '../finance.module.scss';

type Filter = 'all' | TransactionType;

const FILTERS: Filter[] = ['all', 'deposit', 'withdraw', 'bonus', 'cashback'];

const TYPE_ICON = {
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  bonus: Gift,
  cashback: RotateCcw,
} as const;

const TYPE_CLASS = {
  deposit: 'txDeposit',
  withdraw: 'txWithdraw',
  bonus: 'txBonus',
  cashback: 'txBonus',
} as const;

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  pending: 'warning',
  processing: 'info',
  success: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

export function HistoryView() {
  const t = useTranslations('history');
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading } = useTransactions(
    filter === 'all' ? undefined : filter,
  );
  const transactions = (data as Paginated<Transaction> | undefined)?.items ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<HistoryIcon size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <Tabs
        items={FILTERS.map((value) => ({
          value,
          label: t(`types.${value}`),
        }))}
        value={filter}
        onChange={setFilter}
        ariaLabel={t('title')}
      />

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.txList}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.tx}>
                <Skeleton width={42} height={42} radius={14} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="55%" height={15} />
                </div>
                <Skeleton width={80} height={18} />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState title={t('noTransactions')} />
        ) : (
          <div className={styles.txList}>
            {transactions.map((transaction) => {
              const Icon = TYPE_ICON[transaction.type];
              const isCredit =
                transaction.type !== 'withdraw' && transaction.status !== 'failed';

              return (
                <div key={transaction.id} className={styles.tx}>
                  <span
                    className={cn(
                      styles.txIcon,
                      styles[TYPE_CLASS[transaction.type]],
                    )}
                    aria-hidden
                  >
                    <Icon size={19} />
                  </span>

                  <div className={styles.txInfo}>
                    <div className={styles.txTitle}>
                      {t(`types.${transaction.type}`)}
                      {transaction.note ? ` · ${transaction.note}` : ''}
                    </div>
                    <div className={styles.txMeta}>
                      {transaction.reference} ·{' '}
                      {formatDateTime(transaction.createdAt, locale)}
                    </div>
                  </div>

                  <div className={styles.txAmounts}>
                    <Money
                      value={transaction.amount}
                      size="md"
                      showSign={isCredit}
                      tone={
                        transaction.status === 'failed'
                          ? 'muted'
                          : isCredit
                            ? 'success'
                            : 'danger'
                      }
                    />
                    <Badge tone={STATUS_TONE[transaction.status]}>
                      {t(`statuses.${transaction.status}`)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
