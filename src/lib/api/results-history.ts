import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';

/*
 * Data sources, as verified against the live API:
 *
 * - `lotto/results/by-date`            every market's result for one day, with
 *                                      absolute logo URLs, `result_at` and the full
 *                                      first-prize number — but no market code.
 * - `lotto/result-archive-legacy`      carries the market code and reaches back past
 *   `?date=`                           2025; `?from_date&to_date&type=<code>` returns one
 *                                      market's draws (100 rows/page).
 *
 * `lotto/results` (+ `/{code}`) is deliberately not used: its archive stops around
 * 2026-10-11, has no Thai government/GSB draws, and its codes don't match the
 * legacy ones, so names can't be resolved.
 */

/* ----------------------------- Types ------------------------------------- */

/** One market's result on one day. `code` is absent when legacy has no row for it. */
export interface DayMarket {
  name: string;
  code?: string;
  logoUrl?: string;
  groupCode: string;
  groupName: string;
  /** `HH:mm` draw time (Bangkok). */
  time?: string;
  hasResult: boolean;
  /** Full headline number, e.g. "423224" for the government draw. */
  fullNumber?: string;
  top3?: string;
  top2?: string;
  bottom2?: string;
}

export interface DayBoard {
  date: string;
  groups: Array<{ groupCode: string; groupName: string; markets: DayMarket[] }>;
}

/** One row of the flat legacy list. */
export interface ArchiveRow {
  key: string;
  marketCode: string;
  marketName: string;
  date: string;
  time: string;
  number: string;
  top3: string;
  top2: string;
  bottom2: string;
}

export interface ArchiveFlatPage {
  items: ArchiveRow[];
  page: number;
  hasMore: boolean;
}

/* ------------------------------ Raw shapes -------------------------------- */

interface ByDateResponse {
  data?: {
    groups?: Array<{
      group_code?: string;
      group_name?: string;
      markets?: Array<{
        market_name: string;
        market_logo?: string;
        result?: {
          status?: string;
          result_at?: string;
          first_prize?: string;
          result_top_3?: string;
          result_top_2?: string;
          result_bottom_2?: string;
        };
      }>;
    }>;
  };
}

interface LegacyDayResponse {
  groups?: Array<{ markets?: Array<{ market_code: string; market_name: string }> }>;
}

interface LegacyRow {
  id: number;
  lottosName: string;
  lottosTH: string;
  lottosDate: string;
  lottosTime: string;
  lottosNumber: string;
  lottosUnder: string;
}

interface LegacyFlatResponse {
  page?: number;
  count?: number;
  results?: LegacyRow[];
}

const LEGACY_PAGE_SIZE = 100;
/** Safety cap for the page loop in `marketHistory`. */
const MAX_HISTORY_PAGES = 5;

/** `"2026-11-01T00:00:00+07:00"` -> `"2026-11-01"`. */
const dateOnly = (value: string) => value.slice(0, 10);

/**
 * The upstream emits many draws twice (a placeholder row with id 0 plus the real
 * row, same values) — collapse on the visible fields.
 */
function toRows(raw: LegacyRow[] | undefined): ArchiveRow[] {
  const seen = new Set<string>();
  const items: ArchiveRow[] = [];
  for (const row of raw ?? []) {
    const date = dateOnly(row.lottosDate);
    const key = `${row.lottosName}|${date}|${row.lottosTime}|${row.lottosNumber}|${row.lottosUnder}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      key,
      marketCode: row.lottosName,
      marketName: row.lottosTH,
      date,
      time: row.lottosTime,
      number: row.lottosNumber,
      top3: row.lottosNumber.slice(-3),
      top2: row.lottosNumber.slice(-2),
      bottom2: row.lottosUnder,
    });
  }
  return items;
}

const byNewest = (a: ArchiveRow, b: ArchiveRow) =>
  a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1;

/* ------------------------------ Fetchers --------------------------------- */

export const resultsHistoryApi = {
  /** by-date for the numbers/logos, legacy for the market code; joined on the market name. */
  dayBoard: async (date: string): Promise<DayBoard> => {
    const [byDate, legacy] = await Promise.all([
      apiFetch<ByDateResponse>('lotto/results/by-date', { query: { date } }),
      apiFetch<LegacyDayResponse>('lotto/result-archive-legacy', { query: { date } }).catch(
        () => ({}) as LegacyDayResponse,
      ),
    ]);

    const codeByName = new Map<string, string>();
    for (const g of legacy.groups ?? []) {
      for (const m of g.markets ?? []) codeByName.set(m.market_name, m.market_code);
    }

    return {
      date,
      groups: (byDate.data?.groups ?? []).map((g) => ({
        groupCode: g.group_code ?? '',
        groupName: g.group_name ?? '',
        markets: (g.markets ?? []).map((m): DayMarket => {
          const r = m.result;
          const fullNumber = r?.first_prize && r.first_prize.length > 3 ? r.first_prize : undefined;
          return {
            name: m.market_name,
            code: codeByName.get(m.market_name),
            logoUrl: m.market_logo || undefined,
            groupCode: g.group_code ?? '',
            groupName: g.group_name ?? '',
            time: r?.result_at?.slice(11, 16),
            hasResult: r?.status === 'resulted',
            fullNumber,
            top3: r?.result_top_3 || undefined,
            top2: r?.result_top_2 || undefined,
            bottom2: r?.result_bottom_2 || undefined,
          };
        }),
      })),
    };
  },

  /** Every draw of one market in the range, newest first — walks the 100-row pages. */
  marketHistory: async (code: string, fromDate: string, toDate: string): Promise<ArchiveRow[]> => {
    const rows = new Map<string, ArchiveRow>();
    for (let page = 1; page <= MAX_HISTORY_PAGES; page += 1) {
      const res = await apiFetch<LegacyFlatResponse>('lotto/result-archive-legacy', {
        query: { from_date: fromDate, to_date: toDate, type: code, page },
      });
      for (const row of toRows(res.results)) rows.set(row.key, row);
      if ((res.count ?? 0) < LEGACY_PAGE_SIZE) break;
    }
    return [...rows.values()].sort(byNewest);
  },

  flatRange: (fromDate: string, toDate: string, page: number) =>
    apiFetch<LegacyFlatResponse>('lotto/result-archive-legacy', {
      query: { from_date: fromDate, to_date: toDate, page },
    }).then((r): ArchiveFlatPage => ({
      items: toRows(r.results),
      page: r.page ?? page,
      hasMore: (r.count ?? 0) >= LEGACY_PAGE_SIZE,
    })),
};

/* ------------------------------- Hooks ----------------------------------- */

export const useDayBoard = (date: string) =>
  useQuery({
    queryKey: ['lottery', 'archive', 'day', date],
    queryFn: () => resultsHistoryApi.dayBoard(date),
    placeholderData: keepPreviousData,
  });

export const useMarketHistory = (code: string | null, fromDate: string, toDate: string) =>
  useQuery({
    queryKey: ['lottery', 'archive', 'market', code, fromDate, toDate],
    queryFn: () => resultsHistoryApi.marketHistory(code as string, fromDate, toDate),
    enabled: !!code,
    placeholderData: keepPreviousData,
  });

export const useArchiveFlatRange = (fromDate: string, toDate: string, page: number) =>
  useQuery({
    queryKey: ['lottery', 'archive', 'flat', fromDate, toDate, page],
    queryFn: () => resultsHistoryApi.flatRange(fromDate, toDate, page),
    placeholderData: keepPreviousData,
  });
