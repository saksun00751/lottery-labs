'use client';

import { ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { TicketCard } from '@/components/lottery/TicketCard';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Tabs';
import { useRouter } from '@/i18n/navigation';
import { useTickets } from '@/lib/api/queries';
import type { Paginated, Ticket } from '@/types';

import styles from './slip.module.scss';

type Filter = 'all' | 'pending' | 'won' | 'lost';

const FILTERS: Filter[] = ['all', 'pending', 'won', 'lost'];

export function SlipView() {
  const t = useTranslations('lottery.slip');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading } = useTickets(filter === 'all' ? undefined : filter);
  const tickets = (data as Paginated<Ticket> | undefined)?.items ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<ScrollText size={22} />}
        title={t('title')}
        subtitle={t('history')}
      />

      <Tabs
        items={FILTERS.map((value) => ({
          value,
          label: t(`filters.${value}`),
        }))}
        value={filter}
        onChange={setFilter}
        ariaLabel={t('title')}
      />

      {isLoading ? (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={230} radius={20} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title={t('noTickets')}
          description={t('emptyHint')}
          action={
            <Button onClick={() => router.push('/lottery')}>{tNav('lottery')}</Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
