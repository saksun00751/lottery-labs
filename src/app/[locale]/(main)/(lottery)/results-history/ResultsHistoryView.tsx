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
  ARCHIVE_FAMILY_ORDER,
  archiveMarketFamily,
  archiveMarketLabel,
  type ArchiveFamily,
} from '@/config/archive-markets';
import {
  shiftDate,
  useArchiveMarketCodes,
  useArchiveRange,
  useMarketHistory,
  type ArchiveDraw,
} from '@/lib/api/results-history';
import { bangkokToday, formatDrawDate } from '@/lib/utils/bangkok-time';
import { cn } from '@/lib/utils/cn';

import styles from './results-history.module.scss';

type View = 'day' | 'market' | 'feed';

function weekday(date: string, locale: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** Matches the search box against both the display name and the raw market code. */
function matches(code: string, needle: string): boolean {
  if (!needle) return true;
  return (
    archiveMarketLabel(code).toLowerCase().includes(needle) || code.toLowerCase().includes(needle)
  );
}

const byLabel = (a: ArchiveDraw, b: ArchiveDraw) =>
  archiveMarketLabel(a.marketCode).localeCompare(archiveMarketLabel(b.marketCode), 'th');

export function ResultsHistoryView() {
  const t = useTranslations('lottery.resultsHistory');
  const [view, setView] = useState<View>('day');
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

      {view === 'day' && <DailyBoard needle={needle} onOpenHistory={openHistory} />}
      {view === 'market' && (
        <MarketTable needle={needle} code={marketCode} onPick={setMarketCode} />
      )}
      {view === 'feed' && <DateFeed needle={needle} onOpenHistory={openHistory} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Day board: pick a day, see every market that drew on it.
 * Data: lotto/results?from_date=D&to_date=D
 * -------------------------------------------------------------------------- */

function DailyBoard({
  needle,
  onOpenHistory,
}: {
  needle: string;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  const [date, setDate] = useState(today);
  const [family, setFamily] = useState<ArchiveFamily | null>(null);

  const { data, isLoading, isError } = useArchiveRange(date, date);

  // While searching, groups with no match drop out so the tabs only show where results are.
  const groups = useMemo(() => {
    const rows = (data ?? []).filter((d) => matches(d.marketCode, needle));
    return ARCHIVE_FAMILY_ORDER.map((f) => ({
      family: f,
      draws: rows.filter((d) => archiveMarketFamily(d.marketCode) === f).sort(byLabel),
    })).filter((g) => g.draws.length > 0);
  }, [data, needle]);

  const activeFamily =
    family && groups.some((g) => g.family === family) ? family : (groups[0]?.family ?? null);
  const active = groups.find((g) => g.family === activeFamily) ?? null;

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
        {groups.length > 0 && activeFamily && (
          <Tabs
            items={groups.map((g) => ({
              value: g.family,
              label: t(`family.${g.family}`),
              count: g.draws.length,
            }))}
            value={activeFamily}
            onChange={setFamily}
            ariaLabel={t('title')}
            className={styles.groupTabs}
          />
        )}
      </div>

      {isLoading ? (
        <div className={styles.cardGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={92} radius={14} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title={t('error')} />
      ) : !active ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className={styles.cardGrid}>
          {active.draws.map((d) => (
            <MarketCard key={d.marketCode} draw={d} onOpenHistory={onOpenHistory} />
          ))}
        </div>
      )}
    </>
  );
}

function MarketCard({
  draw,
  onOpenHistory,
}: {
  draw: ArchiveDraw;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const label = archiveMarketLabel(draw.marketCode);
  return (
    <button
      type="button"
      className={cn(styles.mCard, styles.mCardLink)}
      onClick={() => onOpenHistory(draw.marketCode)}
      aria-label={`${label} · ${t('viewHistory')}`}
    >
      <header className={styles.mHead}>
        <span className={styles.mName}>{label}</span>
        <ChevronRight size={14} className={styles.mChevron} aria-hidden />
      </header>
      <div className={styles.mNums}>
        <div className={cn(styles.mNum, styles.mNumMain)}>
          <span className={styles.mLabel}>{t('col3top')}</span>
          <span className={styles.mValue}>{draw.top3 ?? '-'}</span>
        </div>
        <div className={styles.mNum}>
          <span className={styles.mLabel}>{t('col2top')}</span>
          <span className={styles.mValue}>{draw.top2 ?? '-'}</span>
        </div>
        <div className={styles.mNum}>
          <span className={styles.mLabel}>{t('col2bottom')}</span>
          <span className={styles.mValue}>{draw.bottom2 ?? '-'}</span>
        </div>
      </div>
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
 * Feed: the last few days, grouped by date.
 * Data: lotto/results?from_date&to_date
 * -------------------------------------------------------------------------- */

const FEED_RANGES = [1, 3, 7] as const;

function DateFeed({
  needle,
  onOpenHistory,
}: {
  needle: string;
  onOpenHistory: (code: string) => void;
}) {
  const t = useTranslations('lottery.resultsHistory');
  const locale = useLocale();
  const today = bangkokToday();

  const [days, setDays] = useState<(typeof FEED_RANGES)[number]>(3);
  const { data, isLoading, isFetching, isError } = useArchiveRange(
    shiftDate(today, -(days - 1)),
    today,
  );

  const sections = useMemo(() => {
    const byDate = new Map<string, ArchiveDraw[]>();
    for (const d of data ?? []) {
      if (!matches(d.marketCode, needle)) continue;
      byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({ date, items: items.sort(byLabel) }));
  }, [data, needle]);

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
                  <li key={r.marketCode}>
                    <button
                      type="button"
                      className={styles.feedRow}
                      onClick={() => onOpenHistory(r.marketCode)}
                    >
                      <span className={styles.feedName}>{archiveMarketLabel(r.marketCode)}</span>
                      <span className={styles.feedNums}>
                        <span className={styles.feedMain}>{r.top3 ?? '-'}</span>
                        <span className={styles.feedUnder}>{r.bottom2 ?? '-'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
