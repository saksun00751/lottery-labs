'use client';

import { Archive, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useSyncExternalStore } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { HanoiResultTable } from '@/components/lottery/HanoiResultTable';
import { Tabs } from '@/components/ui/Tabs';
import { archiveMarketCode, archiveMarketLabel } from '@/config/archive-markets';
import { shiftDate, useArchiveMarketCodes, useMarketHistory } from '@/lib/api/results-history';
import {
  useHanoiHistory,
  useHanoiResults,
  useResultsByDate,
  useResultsByDates,
} from '@/lib/api/queries';
import { bangkokToday, formatDrawDate } from '@/lib/utils/bangkok-time';
import { cn } from '@/lib/utils/cn';
import type { ResultMarket } from '@/types';

import styles from './results-history.module.scss';

type View = 'hanoi' | 'day' | 'market' | 'feed';

function weekday(date: string, locale: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

const noSubscription = () => () => {};

/**
 * `weekday` for server-rendered markup. Node and the browser ship different locale data
 * (Thai short is "ศ." on one and "ศุกร์" on the other), so the name stays blank until
 * hydration is done and only the browser ever formats it.
 */
function useWeekday(locale: string) {
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return (date: string, style?: 'short' | 'long') =>
    hydrated ? weekday(date, locale, style) : '\u00a0';
}

/** Matches the search box against both the display name and the raw market code. */
function matches(code: string, needle: string): boolean {
  if (!needle) return true;
  return (
    archiveMarketLabel(code).toLowerCase().includes(needle) || code.toLowerCase().includes(needle)
  );
}

export function ResultsHistoryView() {
  const t = useTranslations('lottery.resultsHistory');
  const [view, setView] = useState<View>('hanoi');
  const [marketCode, setMarketCode] = useState<string | null>(null);
  // One search box above the tabs; every view filters by it.
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  // Tapping a card on the day board jumps to that market's history.
  const openHistory = (code: string) => {
    setMarketCode(code);
    setView('market');
  };

  return (
    <div className={styles.page}>
      <PageHeader icon={<Archive size={22} />} title={t('title')} subtitle={t('subtitle')} />

      <Tabs
        items={[
          { value: 'hanoi' as View, label: t('viewHanoi') },
          { value: 'day' as View, label: t('viewDay') },
          { value: 'market' as View, label: t('viewMarket') },
          { value: 'feed' as View, label: t('viewFeed') },
        ]}
        value={view}
        onChange={setView}
        ariaLabel={t('title')}
      />

      <div className={styles.searchWrap}>
        <Search size={16} aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchName')}
          aria-label={t('searchName')}
        />
      </div>

      {view === 'hanoi' && <HanoiHistory needle={needle} />}
      {view === 'day' && <DailyBoard needle={needle} onOpenHistory={openHistory} />}
      {view === 'market' && (
        <MarketTable needle={needle} code={marketCode} onPick={setMarketCode} />
      )}
      {view === 'feed' && (
        <DateFeed needle={needle} onOpenHistory={openHistory} onOpenHanoi={() => setView('hanoi')} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Hanoi A/B/C/D: draw days, newest first, loaded a page at a time.
 * Data: lotto/hanoi-abcd/results/history
 * -------------------------------------------------------------------------- */

function HanoiHistory({ needle }: { needle: string }) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useHanoiHistory();

  const days = (data?.pages ?? [])
    .flatMap((page) => page.days)
    .map((day) => ({
      ...day,
      rounds: day.rounds.filter((r) => !needle || r.marketName.toLowerCase().includes(needle)),
    }))
    .filter((day) => day.rounds.length > 0);

  if (isLoading) return <Skeleton height={360} radius={16} />;
  // A failed "load more" keeps the days already on screen.
  if (isError && !data) return <EmptyState title={t('error')} />;

  return (
    <div className={styles.feed}>
      {days.length === 0 && <EmptyState title={t('empty')} />}
      {days.map((day) => (
        <section key={day.date} className={styles.feedSection}>
          <h2 className={styles.feedDate}>
            {weekday(day.date, locale, 'long')} {formatDrawDate(day.date)}
            <span className={styles.feedCount}>{day.rounds.length}</span>
          </h2>
          <div className={styles.hanoiGrid}>
            {day.rounds.map((round) => (
              <HanoiRoundCard key={round.marketId} round={round} />
            ))}
          </div>
        </section>
      ))}
      {isError && <EmptyState title={t('error')} />}
      {hasNextPage && (
        <Button variant="outline" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {t('loadMore')}
        </Button>
      )}
    </div>
  );
}

function HanoiRoundCard({ round }: { round: ResultMarket }) {
  const tResults = useTranslations('lottery.results');
  return (
    <article className={styles.hanoiCard}>
      <header>
        <div className={styles.mName}>{round.marketName}</div>
        <div className={styles.hanoiTime}>{round.drawLabel}</div>
      </header>
      {round.hanoi ? (
        <HanoiResultTable result={round.hanoi} />
      ) : (
        <div className={styles.hanoiEmpty}>{tResults(round.emptyReason ?? 'pending')}</div>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- *
 * Day board: pick a day, see every market that drew on it.
 * Data: lotto/results/by-date, plus lotto/hanoi-abcd/results for the A/B/C/D rounds
 * (`lotto/results` lags behind and carries no Hanoi A/B/C/D numbers).
 * -------------------------------------------------------------------------- */

/** `by-date` lists the A/B/C/D markets without numbers, so that group is swapped out. */
const HANOI_GROUP = 'lotto-hanoi';

function DailyBoard({
  needle,
  onOpenHistory,
}: {
  needle: string;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const dayName = useWeekday(useLocale());
  const today = bangkokToday();

  const [date, setDate] = useState(today);
  const [groupCode, setGroupCode] = useState<string | null>(null);

  const listing = useResultsByDate(date, date === today);
  const hanoi = useHanoiResults(date, date === today);

  const byName = (market: ResultMarket) =>
    !needle || market.marketName.toLowerCase().includes(needle);
  // While searching, groups with no match drop out so the tabs only show where results are.
  const groups = [
    ...(listing.data ?? []).filter((g) => g.groupCode !== HANOI_GROUP),
    { groupCode: HANOI_GROUP, groupName: t('viewHanoi'), markets: hanoi.data ?? [] },
  ]
    .map((g) => ({ ...g, markets: g.markets.filter(byName) }))
    .filter((g) => g.markets.length > 0);

  const active = groups.find((g) => g.groupCode === groupCode) ?? groups[0] ?? null;
  // Wait for both sources so the default tab doesn't jump, and report a failure
  // even when the other source still has something to show.
  const isLoading = listing.isLoading || hanoi.isLoading;
  const isError = (listing.isError && !listing.data) || (hanoi.isError && !hanoi.data);

  const strip = useMemo(
    () => Array.from({ length: 14 }, (_, i) => shiftDate(today, -i)),
    [today],
  );

  return (
    <>
      <div className={styles.dateBar}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label={t('prevDay')}
          onClick={() => setDate(shiftDate(date, -1))}
        >
          <ChevronLeft size={18} />
        </button>
        <div className={styles.strip} role="tablist" aria-label={t('pickDate')}>
          {strip.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === date}
              className={cn(styles.chip, d === date && styles.chipActive)}
              onClick={() => setDate(d)}
            >
              <span className={styles.chipDow}>{dayName(d)}</span>
              <span className={styles.chipDay}>{d.slice(8)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.navBtn}
          aria-label={t('nextDay')}
          disabled={date >= today}
          onClick={() => setDate(shiftDate(date, 1))}
        >
          <ChevronRight size={18} />
        </button>
        <Input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label={t('pickDate')}
          className={styles.dateInput}
        />
      </div>

      <div className={styles.filterRow}>
        <div className={styles.dateHeading}>
          {dayName(date, 'long')} {formatDrawDate(date)}
          {date === today && <Badge tone="accent">{t('today')}</Badge>}
        </div>
        {!isLoading && active && (
          <Tabs
            items={groups.map((g) => ({
              value: g.groupCode,
              label: g.groupName,
              count: g.markets.length,
            }))}
            value={active.groupCode}
            onChange={setGroupCode}
            ariaLabel={t('title')}
            className={styles.groupTabs}
          />
        )}
      </div>

      {isError && !isLoading && <EmptyState title={t('error')} />}

      {isLoading ? (
        <div className={styles.cardGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={92} radius={14} />
          ))}
        </div>
      ) : !active ? (
        !isError && <EmptyState title={t('empty')} />
      ) : active.groupCode === HANOI_GROUP ? (
        <div className={styles.hanoiGrid}>
          {active.markets.map((round) => (
            <HanoiRoundCard key={round.marketId} round={round} />
          ))}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {active.markets.map((market) => (
            <MarketCard key={market.marketId} market={market} onOpenHistory={onOpenHistory} />
          ))}
        </div>
      )}
    </>
  );
}

function MarketCard({
  market,
  onOpenHistory,
}: {
  market: ResultMarket;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const tResults = useTranslations('lottery.results');
  const code = archiveMarketCode(market.marketName);
  const body = (
    <>
      <header className={styles.mHead}>
        <span className={styles.mName}>{market.marketName}</span>
        {code && <ChevronRight size={14} className={styles.mChevron} aria-hidden />}
      </header>
      {market.hasResult ? (
        <div className={styles.mNums}>
          <div className={cn(styles.mNum, styles.mNumMain)}>
            <span className={styles.mLabel}>{t('col3top')}</span>
            <span className={styles.mValue}>{market.numbers['3top'] ?? '-'}</span>
          </div>
          <div className={styles.mNum}>
            <span className={styles.mLabel}>{t('col2top')}</span>
            <span className={styles.mValue}>{market.numbers['2top'] ?? '-'}</span>
          </div>
          <div className={styles.mNum}>
            <span className={styles.mLabel}>{t('col2bottom')}</span>
            <span className={styles.mValue}>{market.numbers['2bottom'] ?? '-'}</span>
          </div>
        </div>
      ) : (
        <div className={styles.hanoiEmpty}>{tResults('pending')}</div>
      )}
    </>
  );

  if (!code) return <article className={styles.mCard}>{body}</article>;
  return (
    <button
      type="button"
      className={cn(styles.mCard, styles.mCardLink)}
      onClick={() => onOpenHistory(code)}
      aria-label={`${market.marketName} · ${t('viewHistory')}`}
    >
      {body}
    </button>
  );
}

/* -------------------------------------------------------------------------- *
 * Market table: one market's draws as a table.
 * Data: lotto/results/{marketCode}, fetched in 45-day windows
 * -------------------------------------------------------------------------- */

const RANGES = [7, 30, 90] as const;
const ROWS_PER_PAGE = 15;

function MarketTable({
  needle,
  code: pickedCode,
  onPick,
}: {
  needle: string;
  code: string | null;
  onPick: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  const { data: codes = [], isLoading: listLoading } = useArchiveMarketCodes(today);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () =>
      [...codes].sort((a, b) =>
        archiveMarketLabel(a).localeCompare(archiveMarketLabel(b), 'th'),
      ),
    [codes],
  );
  const filtered = useMemo(() => sorted.filter((c) => matches(c, needle)), [sorted, needle]);
  const code = pickedCode ?? sorted[0] ?? null;

  const { data: rows, isLoading, isFetching, isError } = useMarketHistory(
    code,
    shiftDate(today, -range),
    today,
  );
  const total = rows?.length ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  const visible = (rows ?? []).slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <>
      <div className={styles.historyBar}>
        <h2 className={styles.tableTitle}>{code ? archiveMarketLabel(code) : ''}</h2>
        <div className={styles.rangeSwitch}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={cn(styles.rangeBtn, r === range && styles.rangeBtnActive)}
              onClick={() => {
                setRange(r);
                setPage(1);
              }}
            >
              {t('rangeDays', { days: r })}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.split}>
        <aside className={styles.picker}>
          <div className={styles.marketList}>
            {listLoading ? (
              Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={34} radius={10} />)
            ) : filtered.length === 0 ? (
              <span className={styles.pickerEmpty}>{t('empty')}</span>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(styles.marketItem, c === code && styles.marketItemActive)}
                  onClick={() => {
                    onPick(c);
                    setPage(1);
                  }}
                >
                  <span>{archiveMarketLabel(c)}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={styles.tablePane}>
          {isLoading ? (
            <Skeleton height={320} radius={16} />
          ) : isError ? (
            <EmptyState title={t('error')} />
          ) : total === 0 ? (
            <EmptyState title={t('empty')} />
          ) : (
            <>
              <div className={cn(styles.tableWrap, isFetching && styles.dim)}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('colDate')}</th>
                      <th>{t('col3top')}</th>
                      <th>{t('col2top')}</th>
                      <th>{t('col2bottom')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr key={row.date}>
                        <td>
                          <span className={styles.tdDate}>{formatDrawDate(row.date)}</span>
                          <span className={styles.tdDow}>{weekday(row.date, locale)}</span>
                        </td>
                        <td className={styles.tdNum}>{row.top3 ?? '-'}</td>
                        <td className={styles.tdNum}>{row.top2 ?? '-'}</td>
                        <td className={styles.tdNum}>{row.bottom2 ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pager}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} /> {t('prev')}
                </Button>
                <span className={styles.pagerInfo}>
                  {t('pageOf', { page, total: lastPage })} · {t('totalDraws', { count: total })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage}
                  onClick={() => setPage(page + 1)}
                >
                  {t('next')} <ChevronRight size={16} />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- *
 * Feed: the last few days, grouped by date. Days appear as their requests land.
 * Data: lotto/results/by-date per day, plus lotto/hanoi-abcd/results/history
 * -------------------------------------------------------------------------- */

const FEED_RANGES = [1, 3, 7] as const;

function DateFeed({
  needle,
  onOpenHistory,
  onOpenHanoi,
}: {
  needle: string;
  onOpenHistory: (code: string) => void;
  onOpenHanoi: () => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  const [days, setDays] = useState<(typeof FEED_RANGES)[number]>(3);
  const dates = Array.from({ length: days }, (_, i) => shiftDate(today, -i));
  const listings = useResultsByDates(dates, today);
  // The first history page is 7 draw days, which always covers the widest range here.
  const hanoi = useHanoiHistory();

  const byName = (a: ResultMarket, b: ResultMarket) =>
    a.marketName.localeCompare(b.marketName, 'th');
  const shown = (market: ResultMarket) =>
    market.hasResult && (!needle || market.marketName.toLowerCase().includes(needle));

  const sections = dates
    .map((date, i) => {
      const listed = (listings[i]?.data ?? [])
        .filter((g) => g.groupCode !== HANOI_GROUP)
        .flatMap((g) => g.markets);
      const rounds =
        hanoi.data?.pages.flatMap((page) => page.days).find((d) => d.date === date)?.rounds ?? [];
      return { date, items: [...listed.filter(shown).sort(byName), ...rounds.filter(shown)] };
    })
    .filter((section) => section.items.length > 0);

  const isLoading = hanoi.isLoading || listings.some((q) => q.isLoading);
  const isError =
    (hanoi.isError && !hanoi.data) || listings.some((q) => q.isError && !q.data);

  return (
    <>
      <div className={styles.feedBar}>
        <div className={styles.rangeSwitch}>
          {FEED_RANGES.map((d) => (
            <button
              key={d}
              type="button"
              className={cn(styles.rangeBtn, d === days && styles.rangeBtnActive)}
              onClick={() => setDays(d)}
            >
              {t('rangeDays', { days: d })}
            </button>
          ))}
        </div>
      </div>

      {isError && <EmptyState title={t('error')} />}

      <div className={styles.feed}>
        {sections.map((s) => (
          <section key={s.date} className={styles.feedSection}>
            <h2 className={styles.feedDate}>
              {weekday(s.date, locale, 'long')} {formatDrawDate(s.date)}
              <span className={styles.feedCount}>{s.items.length}</span>
            </h2>
            <ul className={styles.feedList}>
              {s.items.map((r) => {
                const code = r.hanoi ? undefined : archiveMarketCode(r.marketName);
                const open = r.hanoi
                  ? onOpenHanoi
                  : code
                    ? () => onOpenHistory(code)
                    : undefined;
                return (
                  <li key={`${r.hanoi ? 'draw' : 'market'}-${r.marketId}`}>
                    <button
                      type="button"
                      className={styles.feedRow}
                      disabled={!open}
                      onClick={open}
                    >
                      <span className={styles.feedName}>{r.marketName}</span>
                      <span className={styles.feedNums}>
                        {r.hanoi ? (
                          <span className={styles.feedMain}>{r.hanoi.special || '-'}</span>
                        ) : (
                          <>
                            <span className={styles.feedMain}>{r.numbers['3top'] ?? '-'}</span>
                            <span className={styles.feedUnder}>{r.numbers['2bottom'] ?? '-'}</span>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {isLoading ? (
        <Skeleton height={sections.length > 0 ? 96 : 360} radius={16} />
      ) : (
        sections.length === 0 && !isError && <EmptyState title={t('empty')} />
      )}
    </>
  );
}
