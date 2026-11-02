import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';

/*
 * Result archive — `GET lotto/results`, verified against the live API:
 *
 * - `lotto/results`                       every market's draws. `from_date` + `to_date`
 *                                         (both or neither, max 366 days) narrow it, and
 *                                         `per_page` (max 50) caps the draws kept *per market*.
 * - `lotto/results/{marketCode}`          one market's draws, same query.
 * - `lotto/results/{marketCode}/{date}`   one day. Not used here: the list routes already
 *                                         carry the same numbers.
 * - `.../{date}/{drawKey}`                not used — no `drawKey` is exposed anywhere yet.
 *
 * Quirks the code below works around:
 * - `page` is ignored (every page is page 1) and `meta.total` is 3x the real row count, so
 *   long histories are fetched as consecutive date windows instead of pages.
 * - Rows carry only `three_up` / `two_up` / `two_down` — no market name, time or full number.
 */

/* ----------------------------- Types ------------------------------------- */

export interface ArchiveDraw {
  marketCode: string;
  /** `YYYY-MM-DD` */
  date: string;
  top3?: string;
  top2?: string;
  bottom2?: string;
}

/* ------------------------------ Raw shapes -------------------------------- */

interface RawResults {
  three_up?: string[];
  two_up?: string[];
  two_down?: string[];
}

interface AllMarketsResponse {
  data?: Array<{
    market_code: string;
    draw_dates?: Array<{ draw_date: string; results?: RawResults }>;
  }>;
}

interface MarketResponse {
  data?: Array<{ market_code: string; draw_date: string; results?: RawResults }>;
}

/** Longest date window `per_page` (50) can always cover, even for a market that draws daily. */
const WINDOW_DAYS = 45;
const MAX_PER_PAGE = 50;

function toDraw(marketCode: string, date: string, r: RawResults | undefined): ArchiveDraw {
  return {
    marketCode,
    date,
    top3: r?.three_up?.[0],
    top2: r?.two_up?.[0],
    bottom2: r?.two_down?.[0],
  };
}

const byNewest = (a: ArchiveDraw, b: ArchiveDraw) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

/** `YYYY-MM-DD` shifted by whole days — pure calendar math, no timezone involved. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Splits `[from, to]` into consecutive windows of at most `WINDOW_DAYS` days. */
function windows(fromDate: string, toDate: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let start = fromDate;
  while (start <= toDate) {
    const end = shiftDate(start, WINDOW_DAYS - 1);
    out.push([start, end < toDate ? end : toDate]);
    start = shiftDate(end, 1);
  }
  return out;
}

/* ------------------------------ Fetchers --------------------------------- */

export const resultsHistoryApi = {
  /** Every market that drew in the range (max 50 days), flattened and newest first. */
  range: async (fromDate: string, toDate: string): Promise<ArchiveDraw[]> => {
    const res = await apiFetch<AllMarketsResponse>('lotto/results', {
      query: { from_date: fromDate, to_date: toDate, per_page: MAX_PER_PAGE },
    });
    return (res.data ?? [])
      .flatMap((m) => (m.draw_dates ?? []).map((d) => toDraw(m.market_code, d.draw_date, d.results)))
      .sort(byNewest);
  },

  /**
   * Codes of every market that drew in `[fromDate, toDate]`. The unfiltered listing is not
   * usable for this: its `per_page` trims the number of markets returned (1 -> 10 markets).
   */
  marketCodes: async (fromDate: string, toDate: string): Promise<string[]> => {
    const draws = await resultsHistoryApi.range(fromDate, toDate);
    return [...new Set(draws.map((d) => d.marketCode))];
  },

  /** One market's draws across any range up to 366 days, newest first. */
  marketHistory: async (code: string, fromDate: string, toDate: string): Promise<ArchiveDraw[]> => {
    const parts = await Promise.all(
      windows(fromDate, toDate).map(([from, to]) =>
        apiFetch<MarketResponse>(`lotto/results/${code}`, {
          query: { from_date: from, to_date: to, per_page: MAX_PER_PAGE },
        }),
      ),
    );
    return parts
      .flatMap((p) => p.data ?? [])
      .map((d) => toDraw(d.market_code, d.draw_date, d.results))
      .sort(byNewest);
  },
};

/* ------------------------------- Hooks ----------------------------------- */

/** All markets' draws in `[fromDate, toDate]` — a single day for the board, a few days for the feed. */
export const useArchiveRange = (fromDate: string, toDate: string) =>
  useQuery({
    queryKey: ['lottery', 'archive', 'range', fromDate, toDate],
    queryFn: () => resultsHistoryApi.range(fromDate, toDate),
    placeholderData: keepPreviousData,
  });

/** Markets with a draw in the last 14 days — the list the market tab offers. */
export const useArchiveMarketCodes = (today: string) =>
  useQuery({
    queryKey: ['lottery', 'archive', 'market-codes', today],
    queryFn: () => resultsHistoryApi.marketCodes(shiftDate(today, -13), today),
    staleTime: 10 * 60_000,
  });

export const useMarketHistory = (code: string | null, fromDate: string, toDate: string) =>
  useQuery({
    queryKey: ['lottery', 'archive', 'market', code, fromDate, toDate],
    queryFn: () => resultsHistoryApi.marketHistory(code as string, fromDate, toDate),
    enabled: !!code,
    placeholderData: keepPreviousData,
  });
