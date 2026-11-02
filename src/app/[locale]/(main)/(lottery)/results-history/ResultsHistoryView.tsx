'use client';

import { Archive, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Tabs';
import {
  useArchiveFlatRange,
  useDayBoard,
  useMarketHistory,
  type DayMarket,
} from '@/lib/api/results-history';
import { bangkokToday, formatDrawDate } from '@/lib/utils/bangkok-time';
import { cn } from '@/lib/utils/cn';

import styles from './results-history.module.scss';

type View = 'day' | 'market' | 'feed';

/** `YYYY-MM-DD` shifted by whole days — pure calendar math, no timezone involved. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekday(date: string, locale: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function ResultsHistoryView() {
  const t = useTranslations('lottery.resultsHistory');
  const [view, setView] = useState<View>('day');
  const [marketCode, setMarketCode] = useState<string | null>(null);
  // One search box above the tabs; every view filters by it.
  const [query, setQuery] = useState('');

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

      {view === 'day' && <DailyBoard query={query} onOpenHistory={openHistory} />}
      {view === 'market' && (
        <MarketTable query={query} code={marketCode} onPick={setMarketCode} />
      )}
      {view === 'feed' && <DateFeed query={query} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Day board: pick a day, see every market's result for that day.
 * Data: results/by-date (numbers, logos) + result-archive-legacy?date (market code)
 * -------------------------------------------------------------------------- */

function DailyBoard({
  query,
  onOpenHistory,
}: {
  query: string;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  const [date, setDate] = useState(today);
  const [groupCode, setGroupCode] = useState<string | null>(null);

  const { data, isLoading, isError } = useDayBoard(date);
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = data?.groups ?? [];
    if (!needle) return all;
    // While searching, hide groups with no match so the tabs only show where results are.
    return all
      .map((g) => ({ ...g, markets: g.markets.filter((m) => m.name.toLowerCase().includes(needle)) }))
      .filter((g) => g.markets.length > 0);
  }, [data, query]);
  const activeCode =
    groupCode && groups.some((g) => g.groupCode === groupCode)
      ? groupCode
      : (groups[0]?.groupCode ?? null);
  const active = groups.find((g) => g.groupCode === activeCode) ?? null;

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
              <span className={styles.chipDow}>{weekday(d, locale)}</span>
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
          {weekday(date, locale, 'long')} {formatDrawDate(date)}
          {date === today && <Badge tone="accent">{t('today')}</Badge>}
        </div>
        {groups.length > 0 && activeCode && (
          <Tabs
            items={groups.map((g) => ({
              value: g.groupCode,
              label: g.groupName,
              count: g.markets.length,
            }))}
            value={activeCode}
            onChange={setGroupCode}
            ariaLabel={t('title')}
            className={styles.groupTabs}
          />
        )}
      </div>

      {isLoading ? (
        <div className={styles.cardGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={104} radius={14} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title={t('error')} />
      ) : !active || active.markets.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className={styles.cardGrid}>
          {active.markets.map((m) => (
            <MarketCard key={m.name} market={m} onOpenHistory={onOpenHistory} />
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
  market: DayMarket;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const content = (
    <>
      <header className={styles.mHead}>
        {market.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={market.logoUrl} alt="" className={styles.mLogo} />
        )}
        <span className={styles.mName}>{market.name}</span>
        {market.time && <span className={styles.mTime}>{market.time}</span>}
      </header>
      {market.hasResult ? (
        <>
          {market.fullNumber && (
            <div className={styles.mFull}>
              <span>{t('fullNumber')}</span>
              <b>{market.fullNumber}</b>
            </div>
          )}
          <div className={styles.mNums}>
            <div className={cn(styles.mNum, styles.mNumMain)}>
              <span className={styles.mLabel}>{t('col3top')}</span>
              <span className={styles.mValue}>{market.top3 ?? '-'}</span>
            </div>
            <div className={styles.mNum}>
              <span className={styles.mLabel}>{t('col2top')}</span>
              <span className={styles.mValue}>{market.top2 ?? '-'}</span>
            </div>
            <div className={styles.mNum}>
              <span className={styles.mLabel}>{t('col2bottom')}</span>
              <span className={styles.mValue}>{market.bottom2 ?? '-'}</span>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.pending}>{t('pending')}</div>
      )}
    </>
  );

  // The whole card opens the market's history when we know its code.
  return market.code ? (
    <button
      type="button"
      className={cn(styles.mCard, styles.mCardLink)}
      onClick={() => onOpenHistory(market.code as string)}
      aria-label={`${market.name} · ${t('viewHistory')}`}
    >
      {content}
    </button>
  ) : (
    <article className={styles.mCard}>{content}</article>
  );
}

/* -------------------------------------------------------------------------- *
 * Market table: one market's draws as a table.
 * Data: result-archive-legacy?type=<code> (market list comes from the latest day board)
 * -------------------------------------------------------------------------- */

const RANGES = [7, 30, 90] as const;
const ROWS_PER_PAGE = 15;

function MarketTable({
  query,
  code: pickedCode,
  onPick,
}: {
  query: string;
  code: string | null;
  onPick: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  // Yesterday's board is the most complete market list (today's is still filling in).
  const { data: board, isLoading: listLoading } = useDayBoard(shiftDate(today, -1));
  const markets = useMemo(
    () => (board?.groups ?? []).flatMap((g) => g.markets).filter((m) => m.code),
    [board],
  );

  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => markets.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase())),
    [markets, query],
  );
  const code = pickedCode ?? markets[0]?.code ?? null;
  const current = markets.find((m) => m.code === code);

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
        <h2 className={styles.tableTitle}>{current?.name ?? code}</h2>
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
            {listLoading
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={34} radius={10} />)
              : filtered.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    className={cn(styles.marketItem, m.code === code && styles.marketItemActive)}
                    onClick={() => {
                      onPick(m.code as string);
                      setPage(1);
                    }}
                  >
                    {m.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.logoUrl} alt="" className={styles.marketLogo} />
                    )}
                    <span>{m.name}</span>
                  </button>
                ))}
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
                      <th>{t('colTime')}</th>
                      <th>{t('fullNumber')}</th>
                      <th>{t('col3top')}</th>
                      <th>{t('col2bottom')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr key={row.key}>
                        <td>
                          <span className={styles.tdDate}>{formatDrawDate(row.date)}</span>
                          <span className={styles.tdDow}>{weekday(row.date, locale)}</span>
                        </td>
                        <td className={styles.tdTime}>{row.time}</td>
                        <td className={styles.tdNum}>{row.number}</td>
                        <td className={styles.tdNum}>{row.top3}</td>
                        <td className={styles.tdNum}>{row.bottom2}</td>
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
 * Feed: scroll back through time, filter by market name.
 * Data: result-archive-legacy?from_date&to_date
 * -------------------------------------------------------------------------- */

const FEED_RANGES = [1, 3, 7] as const;

function DateFeed({ query }: { query: string }) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  const [days, setDays] = useState<(typeof FEED_RANGES)[number]>(3);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError } = useArchiveFlatRange(
    shiftDate(today, -(days - 1)),
    today,
    page,
  );

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = (data?.items ?? []).filter(
      (r) => !needle || r.marketName.toLowerCase().includes(needle),
    );
    const byDate = new Map<string, typeof rows>();
    for (const r of rows) {
      byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (a.time < b.time ? 1 : -1)),
      }));
  }, [data, query]);

  return (
    <>
      <div className={styles.feedBar}>
        <div className={styles.rangeSwitch}>
          {FEED_RANGES.map((d) => (
            <button
              key={d}
              type="button"
              className={cn(styles.rangeBtn, d === days && styles.rangeBtnActive)}
              onClick={() => {
                setDays(d);
                setPage(1);
              }}
            >
              {t('rangeDays', { days: d })}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton height={360} radius={16} />
      ) : isError ? (
        <EmptyState title={t('error')} />
      ) : sections.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className={cn(styles.feed, isFetching && styles.dim)}>
          {sections.map((s) => (
            <section key={s.date} className={styles.feedSection}>
              <h2 className={styles.feedDate}>
                {weekday(s.date, locale, 'long')} {formatDrawDate(s.date)}
                <span className={styles.feedCount}>{s.items.length}</span>
              </h2>
              <ul className={styles.feedList}>
                {s.items.map((r) => (
                  <li key={r.key} className={styles.feedRow}>
                    <span className={styles.feedTime}>{r.time}</span>
                    <span className={styles.feedName}>{r.marketName}</span>
                    <span className={styles.feedNums}>
                      <span className={styles.feedMain}>{r.number}</span>
                      <span className={styles.feedUnder}>{r.bottom2}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className={styles.pager}>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} /> {t('prev')}
            </Button>
            <span className={styles.pagerInfo}>{t('pageNo', { page })}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.hasMore}
              onClick={() => setPage(page + 1)}
            >
              {t('next')} <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
