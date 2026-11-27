'use client';

import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { CheckResultModal } from '@/components/lottery/CheckResultModal';
import { ResultCard } from '@/components/lottery/ResultCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Tabs';
import {
  useHanoiResults,
  useResultGroups,
  useResultsByDate,
  useTickets,
} from '@/lib/api/queries';
import { bangkokToday } from '@/lib/utils/bangkok-time';
import type { Paginated, ResultMarket, Ticket } from '@/types';

import styles from './results.module.scss';

/** Its results come from their own endpoint — the shared listings carry no numbers for it. */
const HANOI_GROUP = 'lotto-hanoi';

export function ResultsView() {
  const t = useTranslations('lottery.results');
  const tCommon = useTranslations('common');

  const today = bangkokToday();
  const [drawDate, setDrawDate] = useState('');
  const [searchedDate, setSearchedDate] = useState<string | null>(null);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [activeMarket, setActiveMarket] = useState<ResultMarket | null>(null);

  const isSearching = searchedDate !== null;
  const todayQuery = useResultGroups(!isSearching);
  const searchQuery = useResultsByDate(searchedDate);
  const { data, isLoading, isError } = isSearching ? searchQuery : todayQuery;
  const groups = data ?? [];
  const hanoiDate = searchedDate ?? today;
  const hanoiQuery = useHanoiResults(hanoiDate, hanoiDate === today);
  const hanoiRounds = hanoiQuery.data ?? [];

  const { data: ticketsData } = useTickets();
  const tickets = (ticketsData as Paginated<Ticket> | undefined)?.items ?? [];

  const tabs = groups.map((g) => ({ value: g.groupCode, label: g.groupName }));
  // The shared listing can omit the Hanoi group for a date that still has rounds.
  if (hanoiRounds.length > 0 && !tabs.some((tab) => tab.value === HANOI_GROUP)) {
    tabs.push({ value: HANOI_GROUP, label: t('hanoiTab') });
  }

  const activeGroupCode =
    groupCode && tabs.some((tab) => tab.value === groupCode)
      ? groupCode
      : (tabs[0]?.value ?? null);
  const isHanoi = activeGroupCode === HANOI_GROUP;
  const activeGroup = groups.find((g) => g.groupCode === activeGroupCode) ?? null;
  const markets = isHanoi ? hanoiRounds : (activeGroup?.markets ?? []);
  // Each source fails on its own, so one being down never blanks the other's tabs.
  const showLoading =
    isLoading || ((isHanoi || tabs.length === 0) && hanoiQuery.isLoading);
  const showError = isHanoi ? hanoiQuery.isError && !hanoiQuery.data : isError;

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGroupCode(null);
    setSearchedDate(drawDate || today);
  };

  const onReset = () => {
    setDrawDate('');
    setGroupCode(null);
    setSearchedDate(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader icon={<Trophy size={22} />} title={t('title')} subtitle={t('subtitle')} />

      <form className={styles.searchForm} onSubmit={onSearch}>
        <Input
          type="date"
          value={drawDate}
          max={today}
          onChange={(event) => setDrawDate(event.target.value)}
          aria-label={t('searchLabel')}
        />
        <Button type="submit">{tCommon('search')}</Button>
        {isSearching && (
          <Button type="button" variant="ghost" onClick={onReset}>
            {t('today')}
          </Button>
        )}
      </form>

      {!isLoading && activeGroupCode && (
        <Tabs
          items={tabs}
          value={activeGroupCode}
          onChange={setGroupCode}
          ariaLabel={t('title')}
        />
      )}

      {/* Otherwise a failed listing would look like Hanoi is the only lottery. */}
      {isError && isHanoi && <EmptyState title={t('searchError')} />}

      {showLoading ? (
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={196} radius={20} />
          ))}
        </div>
      ) : showError ? (
        <EmptyState title={t('searchError')} />
      ) : markets.length === 0 ? (
        <EmptyState title={t('noResults')} />
      ) : (
        <div className={styles.grid}>
          {markets.map((market) => (
            <ResultCard
              key={market.marketId}
              market={market}
              ticketCount={
                market.drawId
                  ? tickets.filter((ticket) => ticket.roundId === String(market.drawId)).length
                  : 0
              }
              onCheck={() => setActiveMarket(market)}
            />
          ))}
        </div>
      )}

      <CheckResultModal
        market={activeMarket}
        tickets={tickets}
        onClose={() => setActiveMarket(null)}
      />
    </div>
  );
}
