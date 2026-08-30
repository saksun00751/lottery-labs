'use client';

import { History as HistoryIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { Tabs } from '@/components/ui/Tabs';
import { useTransactions } from '@/lib/api/queries';
import { formatDateTime } from '@/lib/utils/intl';
import type { TransactionStatus, TransactionType } from '@/types';

import styles from '../finance.module.scss';

type Filter = 'all' | TransactionType;

const FILTERS: Filter[] = [
  'all',
  'deposit',
  'withdraw',
  'lotto_bet',
  'lotto_refund',
  'referral',
  'cashback',
  'ic',
  'bonus',
  'game',
  'admin_adjust',
  'rollback',
  'other',
];

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  pending: 'warning',
  processing: 'info',
  success: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

export function HistoryView() {
  const t = useTranslations('history');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>('all');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useTransactions({
    type: filter,
    dateStart: dateFrom || undefined,
    dateStop: dateTo || undefined,
    page,
  });

  const transactions = data?.items ?? [];
  const summary = data?.summary;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const onFilterChange = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDateFrom(dateFromInput);
    setDateTo(dateToInput);
    setPage(1);
  };

  const onClearDate = () => {
    setDateFromInput('');
    setDateToInput('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

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
        onChange={onFilterChange}
        ariaLabel={t('title')}
      />

      <form className={styles.searchForm} onSubmit={onSearch}>
        <Input
          type="date"
          value={dateFromInput}
          onChange={(event) => setDateFromInput(event.target.value)}
          aria-label={t('dateFrom')}
        />
        <Input
          type="date"
          value={dateToInput}
          onChange={(event) => setDateToInput(event.target.value)}
          aria-label={t('dateTo')}
        />
        <Button type="submit">{tCommon('search')}</Button>
        {(dateFrom || dateTo) && (
          <Button type="button" variant="ghost" onClick={onClearDate}>
            {t('clearDate')}
          </Button>
        )}
      </form>

      {!isLoading && !isError && summary && transactions.length > 0 && (
        <div className={styles.summaryBar}>
          <div className={styles.summaryCell}>
            <span className={styles.summaryCellLabel}>{t('summaryCount')}</span>
            <span className={styles.summaryCellValue}>{summary.count}</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryCellLabel}>{t('summaryCredit')}</span>
            <Money value={summary.totalCredit} tone="success" showSign />
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryCellLabel}>{t('summaryDebit')}</span>
            <Money value={-summary.totalDebit} tone="danger" />
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryCellLabel}>{t('summaryNet')}</span>
            <Money
              value={summary.netAmount}
              tone={summary.netAmount >= 0 ? 'success' : 'danger'}
              showSign
            />
          </div>
        </div>
      )}

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.txList}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.tx}>
                <div style={{ flex: 1 }}>
                  <Skeleton width="55%" height={15} />
                </div>
                <Skeleton width={80} height={18} />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState title={t('loadError')} />
        ) : transactions.length === 0 ? (
          <EmptyState title={t('noTransactions')} />
        ) : (
          <>
            <div className={styles.txList}>
              {transactions.map((transaction) => {
                const isCredit = transaction.direction === 'credit';

                return (
                  <div key={transaction.id} className={styles.tx}>
                    <div className={styles.txInfo}>
                      <div className={styles.txTitle}>
                        {transaction.title || t(`types.${transaction.type}`)}
                        <Badge tone={isCredit ? 'success' : 'danger'}>
                          {t(`direction.${transaction.direction}`)}
                        </Badge>
                      </div>
                      {transaction.detail && (
                        <div className={styles.txMeta}>{transaction.detail}</div>
                      )}
                      <div className={styles.txMeta}>
                        {formatDateTime(transaction.createdAt, locale)}
                      </div>
                      <div className={styles.txStatusRow}>
                        <Badge tone={STATUS_TONE[transaction.status]}>
                          {t(`statuses.${transaction.status}`)}
                        </Badge>
                      </div>
                    </div>

                    <div className={styles.txAmounts}>
                      <Money
                        value={transaction.signedAmount}
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
                      {transaction.balanceAfter !== null && (
                        <span className={styles.txBalance}>
                          {t('balanceAfter')} <Money value={transaction.balanceAfter} size="sm" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {data && data.total > data.pageSize && (
              <div className={styles.pagination}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('pagePrev')}
                </Button>
                <span className={styles.paginationLabel}>
                  {t('pageOf', { cur: page, total: totalPages })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore && page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('pageNext')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
