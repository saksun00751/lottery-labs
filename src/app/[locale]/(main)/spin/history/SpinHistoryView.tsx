'use client';

import { Disc3, History as HistoryIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { useWheelHistory } from '@/lib/api/queries';

import styles from '../spin.module.scss';

const PAGE_SIZES = [10, 50, 100] as const;

/** `date` on each group is `DD/MM/YYYY`; the date-input filter value is `YYYY-MM-DD`. */
function toGroupDateFormat(isoDate: string) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function SpinHistoryView() {
  const t = useTranslations('spin');
  const { data: groups, isLoading, isError } = useWheelHistory();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [dateFilter, setDateFilter] = useState('');

  const flat = useMemo(
    () => (groups ?? []).flatMap((g) => g.items.map((item) => ({ date: g.date, ...item }))),
    [groups],
  );

  const filtered = dateFilter
    ? flat.filter((item) => item.date === toGroupDateFormat(dateFilter))
    : flat;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const onDateChange = (value: string) => {
    setDateFilter(value);
    setPage(1);
  };

  const onPageSizeChange = (value: (typeof PAGE_SIZES)[number]) => {
    setPageSize(value);
    setPage(1);
  };

  let lastDate = '';

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<HistoryIcon size={22} />}
        title={t('history')}
        subtitle={t('historySubtitle')}
        actions={
          <Link href="/spin" className={styles.backIcon} aria-label={t('title')}>
            <Disc3 size={16} />
          </Link>
        }
      />

      <div className={styles.filterRow}>
        <Input
          type="date"
          value={dateFilter}
          onChange={(event) => onDateChange(event.target.value)}
          aria-label={t('filterDate')}
        />
        {dateFilter && (
          <Button type="button" variant="ghost" onClick={() => onDateChange('')}>
            {t('filterClear')}
          </Button>
        )}
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 4 }}>
          {PAGE_SIZES.map((size) => (
            <Button
              key={size}
              type="button"
              size="sm"
              variant={pageSize === size ? 'primary' : 'outline'}
              onClick={() => onPageSizeChange(size)}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.spinList}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.spinRow}>
                <Skeleton width="55%" height={15} />
                <Skeleton width={60} height={13} />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState title={t('loadError')} />
        ) : filtered.length === 0 ? (
          <EmptyState title={dateFilter ? t('historyNoResult') : t('historyEmpty')} />
        ) : (
          <>
            <div className={styles.spinList}>
              {pageItems.map((item, idx) => {
                const showDate = item.date !== lastDate;
                lastDate = item.date;
                return (
                  <div key={`${item.date}-${idx}`}>
                    {showDate && (
                      <div className={styles.dateGroup}>
                        <span className={styles.dateChip}>{item.date}</span>
                      </div>
                    )}
                    <div className={styles.spinRow}>
                      <div className={styles.spinRowInfo}>
                        <span className={styles.spinRowIcon}>
                          <Disc3 size={15} />
                        </span>
                        <span className={styles.spinRowCredit}>{item.credit}</span>
                      </div>
                      <span className={styles.spinRowTime}>{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
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
                  disabled={page >= totalPages}
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
