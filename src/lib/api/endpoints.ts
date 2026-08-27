import type {
  Bank,
  BankAccount,
  BetType,
  BetTypeId,
  DepositChannel,
  DrawResult,
  LotteryCategory,
  LotteryGroupSummary,
  LotteryPackage,
  LotteryRound,
  Minor,
  Paginated,
  Promotion,
  ReferralFriend,
  ReferralSummary,
  RestrictedNumber,
  RoundRates,
  RoundStatus,
  Ticket,
  TicketDetail,
  TicketItem,
  TicketStatus,
  Transaction,
  TransactionType,
  User,
  Wallet,
} from '@/types';
import { bangkokToIso, bangkokToday, formatDrawDate } from '@/lib/utils/bangkok-time';
import { toMajor, toMinor } from '@/lib/utils/money';

import { ApiError, apiFetch, newIdempotencyKey } from './client';

type List<T> = { items: T[] };

/* ---------------------------------- auth --------------------------------- */

export const authApi = {
  login: (identifier: string, password: string) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    }).then(unwrap<{ user: User }>),

  register: (payload: RegisterPayload) =>
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(unwrap<{ user: User }>),

  logout: () => fetch('/api/auth/logout', { method: 'POST' }).then(unwrap<void>),

  /**
   * Asks the backend who owns a bank account so the name fields can be filled
   * in for the member instead of typed. Runs while the register form is still
   * open, before any session exists, so it goes through the proxy unauthenticated.
   */
  lookupBankAccountName: (bankCode: string, accountNumber: string) =>
    apiFetch<BankAccountNameResponse>('auth/register/bank-account-name', {
      method: 'POST',
      body: { bank: Number(bankCode), acc_no: accountNumber },
    }).then(normalizeAccountName),
};

export interface RegisterPayload {
  bankCode: string;
  bankAccountNumber: string;
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  phone: string;
  referralCode?: string;
  /** Campaign code picked up from `?market=` and kept in localStorage. */
  marketingCode?: string;
}

export interface BankAccountName {
  valid: boolean;
  accountName: string;
  firstName: string;
  lastName: string;
  message?: string;
}

interface AccountNameFields {
  valid?: boolean;
  account_name?: string;
  firstname?: string;
  lastname?: string;
}

interface BankAccountNameResponse extends AccountNameFields {
  success?: boolean;
  message?: string;
  data?: AccountNameFields;
}

/**
 * The lookup answers either with the fields nested under `data` (a hit) or
 * flat at the root together with `success: false` (the bank could not be
 * reached), so both shapes are read.
 */
function normalizeAccountName(payload: BankAccountNameResponse): BankAccountName {
  const data = payload.data ?? payload;
  const firstName = data.firstname ?? '';
  const lastName = data.lastname ?? '';
  const found = Boolean(firstName || lastName);
  return {
    valid: payload.success !== false && (data.valid ?? found),
    accountName: data.account_name ?? `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    message: payload.message,
  };
}

async function unwrap<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const { ApiError } = await import('./client');
    throw new ApiError(response.status, body);
  }
  return body as T;
}

/* -------------------------------- reference ------------------------------ */

export const referenceApi = {
  banks: () => apiFetch<BanksResponse>('auth/register/banks').then(normalizeBanks),
};

/** Upstream shape: `{ data: { banks: [...] } }`; the mock serves `{ items }`. */
interface BanksResponse {
  items?: Bank[];
  data?: {
    banks?: Array<{
      code: number | string;
      name_th?: string;
      name?: string;
      shortcode?: string | null;
      image_url?: string | null;
    }>;
  };
}

/** Bank brand colours are not part of the upstream payload. */
const BANK_FALLBACK_COLOR = '#64748b';

function normalizeBanks(payload: BanksResponse): Bank[] {
  if (payload.items) return payload.items;

  return (payload.data?.banks ?? []).map((bank) => {
    const name = bank.name_th ?? bank.name ?? String(bank.code);
    return {
      code: String(bank.code),
      name,
      shortName: bank.shortcode ?? name,
      color: BANK_FALLBACK_COLOR,
      logoUrl: bank.image_url ?? undefined,
    };
  });
}

/* --------------------------------- account ------------------------------- */

/**
 * `member/profile`, `member/balance` etc. are only ever documented loosely
 * (`API_ENDPOINTS.md`) — the backend doesn't hand out a schema, and hitting
 * these live requires a signed-in member, which this codebase has no test
 * account for. Every field below is read defensively (several candidate
 * names, a safe fallback) rather than assumed, so an unexpected shape
 * degrades to "0 / empty" instead of throwing.
 */
interface MemberProfileResponse {
  // The real payload nests everything under `profile` — verified live
  // against `GET member/profile` / `GET member/balance` for a signed-in
  // member. `data` / `member` are kept as fallbacks in case another proxied
  // shape ever lands here.
  profile?: MemberProfileFields;
  data?: MemberProfileFields;
  member?: MemberProfileFields;
}
interface MemberProfileFields {
  id?: number | string;
  member_id?: number | string;
  code?: number | string;
  user_name?: string;
  username?: string;
  tel?: string;
  phone?: string;
  name?: string;
  firstname?: string;
  first_name?: string;
  lastname?: string;
  last_name?: string;
  referral_code?: string;
  ref_code?: string;
  created_at?: string;
  bank_code?: number | string;
  bank?: number | string;
  bank_name?: string;
  acc_no?: string;
  acc_name?: string;
}

function normalizeUser(payload: MemberProfileResponse): User {
  const f = payload.profile ?? payload.data ?? payload.member ?? {};
  // No member id comes back on this payload — the phone/username is the
  // only stable identifier the backend actually gives us.
  const username = f.user_name ?? f.username ?? '';
  const id = String(f.id ?? f.member_id ?? f.code ?? username);
  const [nameFirst, ...nameRest] = (f.name ?? '').split(' ');

  return {
    id,
    username,
    phone: f.tel ?? f.phone ?? username,
    firstName: f.firstname ?? f.first_name ?? nameFirst ?? '',
    lastName: f.lastname ?? f.last_name ?? nameRest.join(' '),
    referralCode: f.referral_code ?? f.ref_code ?? '',
    createdAt: f.created_at ?? '',
    bankAccounts:
      f.acc_no && (f.bank_code !== undefined || f.bank !== undefined)
        ? [
            {
              id: `${id}-primary`,
              bankCode: String(f.bank_code ?? f.bank),
              bankName: f.bank_name ?? '',
              accountNumber: f.acc_no,
              accountName: f.acc_name ?? f.name ?? '',
              isPrimary: true,
            },
          ]
        : [],
  };
}

interface BalanceResponse {
  // Verified live: `GET member/balance` nests the figures under `profile`,
  // same as the profile endpoint.
  profile?: BalanceFields;
  data?: BalanceFields;
  success?: boolean;
}
interface BalanceFields {
  balance?: number | string;
  credit?: number | string;
  wallet_balance?: number | string;
  diamond?: number | string;
  point?: number | string;
  cashback?: number | string;
  cashback_balance?: number | string;
  turnover?: number | string;
  monthly_turnover?: number | string;
}

function normalizeWallet(payload: BalanceResponse): Wallet {
  const f = payload.profile ?? payload.data ?? {};
  const num = (v: number | string | undefined) => (v === undefined ? 0 : Number(v));

  return {
    balance: toMinor(num(f.balance ?? f.credit ?? f.wallet_balance)),
    diamond: num(f.diamond ?? f.point),
    cashback: toMinor(num(f.cashback ?? f.cashback_balance)),
    // No monthly-turnover figure exists anywhere on this payload — the real
    // API doesn't expose one here, so this stays 0 rather than a guess.
    monthlyTurnover: toMinor(num(f.turnover ?? f.monthly_turnover)),
    currency: 'THB',
    updatedAt: new Date().toISOString(),
  };
}

export const accountApi = {
  me: () => apiFetch<MemberProfileResponse>('member/profile').then(normalizeUser),

  // `member/balance` is the documented primary path; `member/loadbalance` is
  // the documented fallback for the same figure.
  wallet: () =>
    apiFetch<BalanceResponse>('member/balance')
      .catch(() => apiFetch<BalanceResponse>('member/loadbalance'))
      .then(normalizeWallet),

  bankAccounts: () => accountApi.me().then((user) => user.bankAccounts),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<void>('member/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    }),
};

/* --------------------------------- lottery ------------------------------- */

interface MarketsLatestResponse {
  data?: {
    groups?: Array<{
      group_id?: number;
      group_code?: string;
      group_name?: string;
      group_logo?: string;
      description?: string;
      markets?: MarketEntry[];
    }>;
  };
}
interface MarketEntry {
  market_id: number;
  market_name: string;
  market_logo?: string;
  is_yeekee?: boolean;
  latest_draw?: {
    draw_id?: number;
    draw_date?: string;
    close_at?: string;
    result_at?: string;
    status?: 'open' | 'closed' | 'resulted' | 'refunded';
    result_top_3?: string;
    result_bottom_2?: string;
  } | null;
}

const GROUP_CATEGORY: Record<string, LotteryCategory> = {
  'lotto-thai': 'government',
  'lotto-foreign': 'foreign',
  'lotto-stock': 'stock',
  'lotto-daily': 'laos',
};

function marketStatus(draw: MarketEntry['latest_draw']): RoundStatus {
  if (!draw?.status) return 'closed';
  if (draw.status === 'resulted') return 'settled';
  if (draw.status === 'refunded') return 'closed';
  if (draw.status === 'closed') return 'closed';
  // status === 'open'
  const closesAt = bangkokToIso(draw.close_at);
  const closingSoon = closesAt ? new Date(closesAt).getTime() - Date.now() <= 10 * 60_000 : false;
  return closingSoon ? 'closing' : 'open';
}

/**
 * The bulk market listing carries no bet-type data — that only comes back
 * per-market from the betting-context endpoint (`API_ENDPOINTS.md` §3), which
 * isn't something the home page's round grid calls. `betTypes` is left empty
 * rather than guessed, so the round card simply shows no type chips.
 */
function normalizeRounds(payload: MarketsLatestResponse): LotteryRound[] {
  const groups = payload.data?.groups ?? [];
  return groups.flatMap((group) =>
    (group.markets ?? []).map((market): LotteryRound => {
      const draw = market.latest_draw;
      return {
        id: String(market.market_id),
        name: market.market_name,
        category: market.is_yeekee
          ? 'yeekee'
          : (GROUP_CATEGORY[group.group_code ?? ''] ?? 'foreign'),
        groupCode: group.group_code,
        groupName: group.group_name,
        groupId: group.group_id,
        iconUrl: market.market_logo,
        status: marketStatus(draw),
        closesAt: bangkokToIso(draw?.close_at) ?? '',
        drawsAt: bangkokToIso(draw?.result_at ?? draw?.close_at) ?? '',
        label: formatDrawDate(draw?.draw_date),
        betTypes: [],
        result:
          draw?.result_top_3 || draw?.result_bottom_2
            ? { top3: draw.result_top_3 || undefined, bottom2: draw.result_bottom_2 || undefined }
            : undefined,
        drawId: draw?.draw_id,
      };
    }),
  );
}

interface ResultsByDateResponse {
  data?: {
    groups?: Array<{
      markets?: Array<{
        market_id: number;
        market_name: string;
        result?: {
          draw_date?: string;
          result_at?: string;
          status?: string;
          result_top_3?: string;
          result_top_2?: string;
          result_bottom_2?: string;
        };
      }>;
    }>;
  };
}

function normalizeResults(payload: ResultsByDateResponse): DrawResult[] {
  const groups = payload.data?.groups ?? [];
  const results = groups.flatMap((group) =>
    (group.markets ?? [])
      .filter((market) => market.result?.status === 'resulted')
      .map((market): DrawResult => {
        const r = market.result!;
        const numbers: DrawResult['numbers'] = {};
        if (r.result_top_3) numbers['3top'] = r.result_top_3;
        if (r.result_top_2) numbers['2top'] = r.result_top_2;
        if (r.result_bottom_2) numbers['2bottom'] = r.result_bottom_2;
        return {
          roundId: String(market.market_id),
          roundName: market.market_name,
          roundLabel: formatDrawDate(r.draw_date),
          drawnAt: bangkokToIso(r.result_at) ?? '',
          numbers,
        };
      }),
  );
  return results.sort((a, b) => b.drawnAt.localeCompare(a.drawnAt));
}

/** Group-level summary for the home page's "lottery groups" shortcut section. */
function normalizeGroups(payload: MarketsLatestResponse): LotteryGroupSummary[] {
  const groups = payload.data?.groups ?? [];
  return groups.map((group) => {
    const markets = group.markets ?? [];
    const openCount = markets.filter((m) => marketStatus(m.latest_draw) !== 'closed').length;
    return {
      id: group.group_code ?? String(group.group_id ?? ''),
      groupId: group.group_id ?? 0,
      category: GROUP_CATEGORY[group.group_code ?? ''] ?? 'foreign',
      name: group.group_name ?? '',
      description: group.description,
      logoUrl: group.group_logo,
      openCount,
      totalCount: markets.length,
    } satisfies LotteryGroupSummary;
  });
}

/* The digit count each bet type expects — needed by BetType.digits below. */
const BET_TYPE_DIGITS: Record<BetTypeId, 1 | 2 | 3> = {
  '3top': 3,
  '3tod': 3,
  '3bottom': 3,
  '2top': 2,
  '2bottom': 2,
  run_top: 1,
  run_bottom: 1,
};

/** API `bet_type` code → this app's `BetTypeId`. No `3bottom` equivalent exists upstream. */
const API_BET_TYPE_TO_ID: Record<string, BetTypeId> = {
  top_3: '3top',
  tod_3: '3tod',
  top_2: '2top',
  bottom_2: '2bottom',
  run_top: 'run_top',
  run_bottom: 'run_bottom',
};

/** The reverse of `API_BET_TYPE_TO_ID` — what `POST /lotto/bet` expects in each item.
 * `3bottom` has no upstream code (see `API_BET_TYPE_TO_ID`) and is intentionally absent
 * rather than guessed — nothing in this app ever produces a `3bottom` entry today. */
const BET_TYPE_ID_TO_API: Partial<Record<BetTypeId, string>> = {
  '3top': 'top_3',
  '3tod': 'tod_3',
  '2top': 'top_2',
  '2bottom': 'bottom_2',
  run_top: 'run_top',
  run_bottom: 'run_bottom',
};

interface BettingContextResponse {
  data?: {
    limits?: {
      bet_types?: Array<{
        bet_type: string;
        min_bet?: number;
        max_bet?: number;
        payout?: number;
      }>;
    };
    blocked_numbers?: {
      items?: Array<{
        bet_type: string;
        number: string;
        mode: 'block' | 'limit';
        max_amount?: number;
      }>;
    };
  };
}

function normalizeRates(roundId: string, payload: BettingContextResponse): RoundRates {
  const rows = payload.data?.limits?.bet_types ?? [];
  const betTypes: BetType[] = rows.flatMap((row) => {
    const id = API_BET_TYPE_TO_ID[row.bet_type];
    if (!id) return [];
    return [
      {
        id,
        digits: BET_TYPE_DIGITS[id],
        payout: row.payout ?? 0,
        minStake: toMinor(row.min_bet ?? 0),
        maxStake: toMinor(row.max_bet ?? 0),
      },
    ];
  });

  // Mirrors lotto-seed-app's `mapBlockedNumbers` — `block` closes the number
  // outright, `limit` just caps the stake still accepted for it.
  const restricted: RestrictedNumber[] = (payload.data?.blocked_numbers?.items ?? []).flatMap(
    (item) => {
      const id = API_BET_TYPE_TO_ID[item.bet_type];
      if (!id) return [];
      return [
        {
          betType: id,
          number: item.number,
          closed: item.mode === 'block',
          maxAmount: item.mode === 'limit' ? toMinor(item.max_amount ?? 0) : null,
        },
      ];
    },
  );

  return { roundId, betTypes, restricted };
}

/**
 * The real `POST /lotto/bet` response shape isn't documented — read
 * defensively the same way as every other real-money field in this file.
 * `GET /lotto/tickets` (confirmed live) returns each slip's numeric id as
 * `id` with no separate reference string, so that's the reference shown.
 */
interface BetSubmitResponse {
  data?: {
    id?: number | string;
    bet_id?: number | string;
    ticket_id?: number | string;
    created_at?: string;
  } | null;
}

function normalizeTicket(
  payload: BetSubmitResponse,
  ctx: { roundId: string; roundName: string; roundLabel: string; items: TicketItem[] },
): Ticket {
  const f = payload.data ?? {};
  const id = f.id ?? f.bet_id ?? f.ticket_id ?? '';
  return {
    id: String(id),
    reference: String(id),
    roundId: ctx.roundId,
    roundName: ctx.roundName,
    roundLabel: ctx.roundLabel,
    createdAt: f.created_at ?? new Date().toISOString(),
    status: 'pending',
    itemCount: ctx.items.length,
    totalStake: ctx.items.reduce((sum, item) => sum + item.stake, 0),
    totalWin: 0,
  };
}

/**
 * `GET /lotto/tickets` — confirmed live: summary rows only, no numbered
 * items. `id` doubles as the reference (no separate reference string).
 */
interface TicketListResponse {
  data?: Array<{
    id?: number | string;
    draw_id?: number | string;
    market_name?: string;
    market_logo?: string;
    market_icon?: string;
    group_name?: string;
    status?: string;
    created_at?: string;
    item_count?: number;
    total_bet_amount?: number;
    total_amount?: number;
    total_win_amount?: number;
    refund_amount?: number;
    cancelled_at?: string | null;
    is_final?: boolean;
    is_winner?: boolean;
    result_outcome?: string;
  }> | null;
}

/**
 * The list endpoint carries no clean single status enum — it's derived from
 * cancellation/refund/finality flags the same way lotto-seed-app's own UI
 * does, since the raw `status`/`result_outcome` strings aren't documented.
 */
function ticketStatus(row: {
  cancelled_at?: string | null;
  refund_amount?: number;
  is_final?: boolean;
  is_winner?: boolean;
  result_outcome?: string;
}): TicketStatus {
  if (row.cancelled_at || row.result_outcome === 'cancelled') return 'void';
  if (row.result_outcome === 'refunded' || (row.refund_amount ?? 0) > 0) return 'refunded';
  if (!row.is_final) return 'pending';
  return row.is_winner ? 'won' : 'lost';
}

function normalizeTicketList(payload: TicketListResponse): Paginated<Ticket> {
  const rows = payload.data ?? [];
  const items = rows.map((row) => ({
    id: String(row.id ?? ''),
    reference: String(row.id ?? ''),
    roundId: String(row.draw_id ?? ''),
    roundName: row.market_name ?? '',
    roundLabel: '',
    iconUrl: row.market_icon || row.market_logo || undefined,
    groupName: row.group_name,
    createdAt: row.created_at ?? '',
    status: ticketStatus(row),
    itemCount: row.item_count ?? 0,
    totalStake: toMinor(Number(row.total_bet_amount ?? row.total_amount ?? 0)),
    totalWin: toMinor(Number(row.total_win_amount ?? 0)),
  }));
  return { items, page: 1, pageSize: items.length, total: items.length };
}

/**
 * `GET /lotto/tickets/{id}` — shape confirmed via lotto-seed-app's working
 * `fetchSlipDetail()`. Only this per-ticket call returns numbered items.
 */
interface TicketDetailResponse {
  data?: {
    id?: number | string;
    draw_id?: number | string;
    market_name?: string;
    market_icon?: string;
    market_logo?: string;
    group_name?: string;
    status?: string;
    created_at?: string;
    item_count?: number;
    total_bet_amount?: number;
    total_amount?: number;
    total_discount_amount?: number;
    total_net_amount?: number;
    total_win_amount?: number;
    refund_amount?: number;
    cancelled_at?: string | null;
    is_final?: boolean;
    is_winner?: boolean;
    result_outcome?: string;
    items?: Array<{
      bet_type?: string;
      number?: string;
      amount?: number;
      payout_at_time?: number;
      result_status?: string | null;
      win_amount?: number;
    }>;
  } | null;
}

function normalizeTicketDetail(payload: TicketDetailResponse): TicketDetail {
  const f = payload.data ?? {};
  const items: TicketItem[] = (f.items ?? []).flatMap((row) => {
    const betType = row.bet_type ? API_BET_TYPE_TO_ID[row.bet_type] : undefined;
    if (!betType) return [];
    return [
      {
        betType,
        number: row.number ?? '',
        stake: toMinor(Number(row.amount ?? 0)),
        payout: Number(row.payout_at_time ?? 0),
        status:
          row.result_status === 'win'
            ? 'won'
            : row.result_status === 'lose'
              ? 'lost'
              : 'pending',
        winAmount: toMinor(Number(row.win_amount ?? 0)),
      },
    ];
  });

  return {
    id: String(f.id ?? ''),
    reference: String(f.id ?? ''),
    roundId: String(f.draw_id ?? ''),
    roundName: f.market_name ?? '',
    roundLabel: '',
    iconUrl: f.market_icon || f.market_logo || undefined,
    groupName: f.group_name,
    createdAt: f.created_at ?? '',
    status: ticketStatus(f),
    itemCount: f.item_count ?? items.length,
    totalStake: toMinor(Number(f.total_bet_amount ?? f.total_amount ?? 0)),
    totalWin: toMinor(Number(f.total_win_amount ?? 0)),
    totalDiscount: toMinor(Number(f.total_discount_amount ?? 0)),
    totalNet: toMinor(Number(f.total_net_amount ?? f.total_amount ?? 0)),
    items,
  };
}

/**
 * Package (payout-rate tier) endpoints. Shapes follow lotto-seed-app's own
 * working integration against this same backend (`PackageModalButton.tsx`,
 * `LotteryLayoutPage.tsx`'s `SelectedPackageResponse`) — this session's own
 * live session token expired before these specific responses could be
 * captured directly, so the normalizers stay defensive: an unrecognized
 * shape falls back to "no package selected" rather than guessing an id.
 */
interface PackagesResponse {
  data?: Array<{
    id?: number;
    name?: string;
    image?: string;
    is_active?: boolean;
  }> | null;
}

function normalizePackages(payload: PackagesResponse): LotteryPackage[] {
  const rows = payload.data ?? [];
  return rows
    .filter((p) => p.is_active !== false && Number.isFinite(p.id))
    .map((p) => ({ id: p.id as number, name: p.name ?? '', imageUrl: p.image || undefined }));
}

interface SelectedPackageResponse {
  success?: boolean;
  selected?: boolean;
  data?: {
    package_id?: number;
    name?: string;
    image?: string;
    discount_percent?: number;
    // Per-bet-type payout/discount overrides — mirrors lotto-seed-app's
    // `SelectedPackageResponse.data.bet_settings`, merged into the base
    // betting-context rates once a package is selected (see `mergePackageRates`).
    bet_settings?: Array<{
      bet_type: string;
      payout?: number;
      discount_percent?: number;
    }>;
  } | null;
}

function normalizeSelectedPackage(payload: SelectedPackageResponse): LotteryPackage | null {
  if (!payload.selected || !payload.data || !Number.isFinite(payload.data.package_id)) {
    return null;
  }
  const betSettings = (payload.data.bet_settings ?? []).flatMap((row) => {
    const betType = API_BET_TYPE_TO_ID[row.bet_type];
    if (!betType) return [];
    return [
      {
        betType,
        payout: Number(row.payout ?? 0),
        discountPercent: Number(row.discount_percent ?? 0),
      },
    ];
  });
  return {
    id: payload.data.package_id as number,
    name: payload.data.name ?? '',
    imageUrl: payload.data.image || undefined,
    discountPercent: payload.data.discount_percent,
    betSettings,
  };
}

export const lotteryApi = {
  rounds: (_category?: string) =>
    apiFetch<MarketsLatestResponse>('lotto/markets/latest').then(normalizeRounds),

  packages: (groupId: number) =>
    apiFetch<PackagesResponse>(`lotto/groups/${groupId}/packages`).then(normalizePackages),

  selectedPackage: (groupId: number) =>
    apiFetch<SelectedPackageResponse>(`lotto/groups/${groupId}/selected-package`).then(
      normalizeSelectedPackage,
    ),

  selectPackage: (groupId: number, packageId: number) =>
    apiFetch<void>(`lotto/groups/${groupId}/select-package`, {
      method: 'POST',
      body: { package_id: packageId },
    }),

  groups: () =>
    apiFetch<MarketsLatestResponse>('lotto/markets/latest').then(normalizeGroups),

  round: (id: string) =>
    lotteryApi.rounds().then((rounds) => rounds.find((r) => r.id === id)),

  rates: (id: string) =>
    apiFetch<BettingContextResponse>(`lotto/markets/${id}/betting-context`).then((payload) =>
      normalizeRates(id, payload),
    ),

  results: () =>
    apiFetch<ResultsByDateResponse>('lotto/results/by-date', {
      query: { draw_date: bangkokToday() },
    }).then(normalizeResults),

  tickets: () => apiFetch<TicketListResponse>('lotto/tickets').then(normalizeTicketList),

  ticketDetail: (id: string) =>
    apiFetch<TicketDetailResponse>(`lotto/tickets/${id}`).then(normalizeTicketDetail),

  // Shape confirmed via lotto-seed-app's own working `cancelSlip()` — an
  // empty body, `{success, message}` back.
  cancelTicket: (id: string) =>
    apiFetch<{ success?: boolean; message?: string }>(`lotto/tickets/${id}/cancel`, {
      method: 'POST',
      body: {},
      idempotencyKey: newIdempotencyKey(),
    }),

  // `package_id` is always `null` — this app has no package-rate selection
  // flow (unlike the reference app), and the real backend already treats a
  // missing package as "use the default rate", per its own `confirmBet`.
  submitSlip: (payload: {
    roundId: string;
    roundName: string;
    roundLabel: string;
    drawId: number;
    /** The member's currently selected package for this round's group, if any. */
    packageId?: number | null;
    items: Array<{ betType: BetTypeId; number: string; stake: Minor; payout: number }>;
  }) => {
    const items = payload.items.flatMap((item) => {
      const betType = BET_TYPE_ID_TO_API[item.betType];
      if (!betType) return [];
      return [{ bet_type: betType, number: item.number, amount: toMajor(item.stake) }];
    });

    return apiFetch<BetSubmitResponse>('lotto/bet', {
      method: 'POST',
      body: { draw_id: payload.drawId, package_id: payload.packageId ?? null, items },
      idempotencyKey: newIdempotencyKey(),
    }).then((res) =>
      normalizeTicket(res, {
        roundId: payload.roundId,
        roundName: payload.roundName,
        roundLabel: payload.roundLabel,
        items: payload.items.map(
          (i): TicketItem => ({
            betType: i.betType,
            number: i.number,
            stake: i.stake,
            payout: i.payout,
            status: 'pending',
            winAmount: 0,
          }),
        ),
      }),
    );
  },
};

/* ---------------------------------- wallet ------------------------------- */

export const walletApi = {
  channels: () =>
    apiFetch<List<DepositChannel>>('wallet/channels').then((r) => r.items),

  transactions: (params: { type?: TransactionType; page?: number } = {}) =>
    apiFetch<Paginated<Transaction>>('wallet/transactions', { query: params }),

  deposit: (payload: { amount: number; channelId: string; promotionId?: string }) =>
    apiFetch<Transaction>('wallet/deposits', {
      method: 'POST',
      body: payload,
      idempotencyKey: newIdempotencyKey(),
    }),

  withdraw: (payload: { amount: number; bankAccountId: string }) =>
    apiFetch<Transaction>('wallet/withdrawals', {
      method: 'POST',
      body: payload,
      idempotencyKey: newIdempotencyKey(),
    }),

  // `API_ENDPOINTS.md` §9: `source` is one of bonus | cashback | faststart | ic.
  // The response shape isn't documented — read defensively, same as balance.
  claimCashback: () =>
    apiFetch<{ data?: { claimed?: number | string; balance?: number | string } }>(
      'wallet/claim',
      {
        method: 'POST',
        body: { source: 'cashback' },
        idempotencyKey: newIdempotencyKey(),
      },
    ).then((res) => ({
      claimed: toMinor(Number(res.data?.claimed ?? 0)),
      balance: toMinor(Number(res.data?.balance ?? 0)),
    })),
};

/* -------------------------------- promotions ----------------------------- */

interface PromotionListResponse {
  data?: PromotionEntry[] | { promotions?: PromotionEntry[] };
}
interface PromotionEntry {
  id?: number | string;
  code?: string;
  title?: string;
  name?: string;
  description?: string;
  detail?: string;
  image?: string;
  image_url?: string;
  badge?: string;
  min_deposit?: number | string;
  bonus_percent?: number | string;
  turnover_multiplier?: number | string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_selected?: boolean;
  claimed?: boolean;
  claimable?: boolean;
  terms?: string[];
}

function normalizePromotions(payload: PromotionListResponse): Promotion[] {
  const list = Array.isArray(payload.data)
    ? payload.data
    : (payload.data?.promotions ?? []);

  return list.map((p) => ({
    id: String(p.id ?? p.code ?? ''),
    title: p.title ?? p.name ?? '',
    description: p.description ?? p.detail ?? '',
    imageUrl: p.image_url ?? p.image,
    badge: p.badge,
    minDeposit: toMinor(Number(p.min_deposit ?? 0)),
    bonusPercent: Number(p.bonus_percent ?? 0),
    turnoverMultiplier: Number(p.turnover_multiplier ?? 1),
    startsAt: p.starts_at ?? null,
    endsAt: p.ends_at ?? null,
    claimed: p.claimed ?? p.is_selected ?? false,
    claimable: p.claimable ?? true,
    terms: p.terms ?? [],
  }));
}

export const promotionApi = {
  // Documented as open to guests, but the live API 401s without a session —
  // guests simply see an empty list rather than a thrown error.
  list: () =>
    apiFetch<PromotionListResponse>('promotion/list')
      .then(normalizePromotions)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) return [];
        throw error;
      }),
  claim: (id: string) =>
    apiFetch<void>('promotion/select', {
      method: 'POST',
      body: { promotion: id },
      idempotencyKey: newIdempotencyKey(),
    }),
};

/* --------------------------------- referral ------------------------------ */

export const referralApi = {
  summary: () => apiFetch<ReferralSummary>('referral'),
  friends: (page = 1) =>
    apiFetch<Paginated<ReferralFriend>>('referral/friends', { query: { page } }),
};
