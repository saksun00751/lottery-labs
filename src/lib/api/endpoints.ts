import type {
  Bank,
  BankAccount,
  BetType,
  BetTypeId,
  BonusSource,
  BonusSummary,
  ContactChannel,
  DepositChannel,
  DepositMethod,
  DepositPaymentProvider,
  GameCategory,
  GameItem,
  GameProvider,
  LotteryCategory,
  LotteryGroupSummary,
  LotteryPackage,
  LotteryRound,
  Minor,
  Paginated,
  Promotion,
  ReferralFriend,
  ReferralSummary,
  ResultGroup,
  ResultMarket,
  RestrictedNumber,
  RoundRates,
  RoundStatus,
  Ticket,
  TicketDetail,
  TicketItem,
  TicketStatus,
  Transaction,
  TransactionDirection,
  TransactionHistoryPage,
  TransactionStatus,
  TransactionType,
  User,
  Wallet,
  WheelHistoryGroup,
  WheelHistoryItem,
  WheelSegment,
  WheelSpinResult,
  WithdrawInfo,
} from '@/types';
import { bangkokToIso, formatDrawDate } from '@/lib/utils/bangkok-time';
import { toMajor, toMinor } from '@/lib/utils/money';

import { ApiError, apiFetch, newIdempotencyKey } from './client';

/**
 * Several mutations reject a business rule (e.g. "already claimed", "balance
 * too high for this promo") with HTTP 200 and `{ success: false, message }`
 * instead of a non-2xx status — `apiFetch` only throws on the latter, so
 * without this every one of those calls would resolve as a silent success.
 * Verified live against `POST promotion/select`.
 */
function assertSuccess<T extends { success?: boolean; message?: string; msg?: string }>(
  payload: T,
): T {
  if (payload.success === false) {
    throw new ApiError(200, { message: payload.message || payload.msg || 'Request failed' });
  }
  return payload;
}

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
  getpro?: boolean;
  pro?: boolean;
  pro_name?: string;
  /** Balance threshold (turnover) the member must clear before withdrawing while a promo is active. */
  amount_balance?: number | string;
  /** Once turnover clears, a withdrawal is forced to exactly this amount. Also carried on `member/loadbalance`. */
  withdraw_limit_amount?: number | string;
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
    activePromotionName: (f.getpro ?? f.pro) && f.pro_name ? f.pro_name : null,
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

  // Verified against lotto-seed-app's working `changePasswordAction`:
  // `POST member/change-password` takes only the new password twice, no
  // current password at all.
  changePassword: (password: string, passwordConfirmation: string) =>
    apiFetch<void>('member/change-password', {
      method: 'POST',
      body: { password, password_confirmation: passwordConfirmation },
    }),

  withdrawInfo: () =>
    Promise.all([
      apiFetch<LoadBalanceResponse>('member/loadbalance'),
      apiFetch<MemberProfileResponse>('member/profile'),
    ]).then(([loadBalance, memberProfile]) => normalizeWithdrawInfo(loadBalance, memberProfile)),

  // Ported from lotto-seed-app's `/bonus` page — the four claimable pools
  // (`bonus`, `cashback`, `faststart`, `ic`/`winlost`) only show up on
  // `member/loadbalance`, not `member/balance`.
  bonusSummary: () =>
    apiFetch<LoadBalanceResponse>('member/loadbalance').then(normalizeBonusSummary),
};

function normalizeBonusSummary(payload: LoadBalanceResponse): BonusSummary {
  const p = payload.profile ?? {};
  const num = (v: number | string | undefined) => (v === undefined ? 0 : Number(v));

  return {
    bonus: toMinor(num(p.bonus)),
    cashback: toMinor(num(p.cashback)),
    faststart: toMinor(num(p.faststart)),
    ic: toMinor(num(p.ic ?? p.winlost)),
  };
}

/**
 * `member/loadbalance` — carries the withdraw limits and the daily running
 * total alongside the balance figure. Shape confirmed via lotto-seed-app's
 * own working `WithdrawRoute` (`app/[locale]/(protected)/withdraw/page.tsx`).
 */
interface LoadBalanceProfileFields {
  name?: string;
  bank_code?: number | string;
  acc_no?: string;
  balance?: number | string;
  withdraw_min?: number | string;
  withdraw_max?: number | string;
  maxwithdraw_day?: number | string;
  withdraw_sum_today?: number | string;
  withdraw_remain_today?: number | string;
  withdraw_limit_amount?: number | string;
  bonus?: number | string;
  cashback?: number | string;
  faststart?: number | string;
  ic?: number | string;
  winlost?: number | string;
}
interface LoadBalanceResponse {
  success?: boolean;
  /** Whether withdrawals are open system-wide right now. */
  withdraw?: boolean;
  profile?: LoadBalanceProfileFields;
  system?: { notice?: string | null };
}

function normalizeWithdrawInfo(
  loadBalance: LoadBalanceResponse,
  memberProfile: MemberProfileResponse,
): WithdrawInfo {
  const p = loadBalance.profile ?? {};
  const mp = memberProfile.profile ?? memberProfile.data ?? memberProfile.member ?? {};
  const num = (v: number | string | undefined) => (v === undefined ? 0 : Number(v));

  return {
    canWithdraw: loadBalance.withdraw ?? true,
    notice: loadBalance.system?.notice ?? null,
    min: toMinor(num(p.withdraw_min ?? 100)),
    max: toMinor(num(p.withdraw_max ?? 200_000)),
    maxPerDay: toMinor(num(p.maxwithdraw_day ?? 200_000)),
    sumToday: toMinor(num(p.withdraw_sum_today)),
    remainToday: toMinor(num(p.withdraw_remain_today)),
    bankAccount: p.acc_no
      ? {
          bankCode: String(p.bank_code ?? ''),
          accountNumber: p.acc_no,
          accountName: p.name ?? '',
        }
      : null,
    promo: {
      active: Boolean(mp.getpro && mp.pro),
      name: typeof mp.pro_name === 'string' ? mp.pro_name : null,
      turnoverRequired: toMinor(num(mp.amount_balance)),
      withdrawLimit: toMinor(num(mp.withdraw_limit_amount ?? p.withdraw_limit_amount)),
    },
  };
}

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
      group_id?: number;
      group_code?: string;
      group_name?: string;
      description?: string;
      markets?: Array<{
        market_id: number;
        market_name: string;
        market_logo?: string;
        result?: {
          draw_id?: number;
          draw_date?: string;
          status?: string;
          result_top_3?: string;
          result_bottom_2?: string;
        };
      }>;
    }>;
  };
}

/** `2top` is never sent by the backend — it's always the last two digits of `3top`. */
function resultNumbers(top3?: string, bottom2?: string): ResultMarket['numbers'] {
  const numbers: ResultMarket['numbers'] = {};
  if (top3) {
    numbers['3top'] = top3;
    numbers['2top'] = top3.slice(-2);
  }
  if (bottom2) numbers['2bottom'] = bottom2;
  return numbers;
}

function normalizeResultGroups(payload: ResultsByDateResponse): ResultGroup[] {
  const groups = payload.data?.groups ?? [];
  return groups.map((group): ResultGroup => ({
    groupCode: group.group_code ?? String(group.group_id ?? ''),
    groupName: group.group_name ?? '',
    description: group.description,
    markets: (group.markets ?? []).map((market): ResultMarket => {
      const r = market.result;
      return {
        marketId: market.market_id,
        drawId: r?.draw_id,
        marketName: market.market_name,
        iconUrl: market.market_logo,
        drawLabel: formatDrawDate(r?.draw_date),
        hasResult: r?.status === 'resulted',
        numbers: resultNumbers(r?.result_top_3, r?.result_bottom_2),
      };
    }),
  }));
}

/** The default (today) view reuses the same market listing the home page pulls from. */
function normalizeResultGroupsFromMarkets(payload: MarketsLatestResponse): ResultGroup[] {
  const groups = payload.data?.groups ?? [];
  return groups.map((group): ResultGroup => ({
    groupCode: group.group_code ?? String(group.group_id ?? ''),
    groupName: group.group_name ?? '',
    description: group.description,
    markets: (group.markets ?? []).map((market): ResultMarket => {
      const draw = market.latest_draw;
      return {
        marketId: market.market_id,
        drawId: draw?.draw_id,
        marketName: market.market_name,
        iconUrl: market.market_logo,
        drawLabel: formatDrawDate(draw?.draw_date),
        hasResult: draw?.status === 'resulted',
        numbers: resultNumbers(draw?.result_top_3, draw?.result_bottom_2),
      };
    }),
  }));
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

  /** Today's results — reuses the same listing the home page's round grid pulls from. */
  resultGroups: () =>
    apiFetch<MarketsLatestResponse>('lotto/markets/latest').then(normalizeResultGroupsFromMarkets),

  resultsByDate: (drawDate: string) =>
    apiFetch<ResultsByDateResponse>('lotto/results/by-date', {
      query: { draw_date: drawDate },
    }).then(normalizeResultGroups),

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

// Verified against `API_ENDPOINTS.md` §12 / ported from lotto-seed-app's
// `lib/server/transactions.ts` (`getTransactionsByTab`) — `GET wallet/transactions`
// takes `type` (one of the 12 backend tab ids, or 'all'), `date_start`, `date_stop`,
// `page`, and answers `{ data: { items, summary, pagination } }`.
interface WalletTxItem {
  id?: number | string;
  created_at?: string;
  type?: string;
  type_label?: string;
  direction?: string;
  amount?: number | string;
  signed_amount?: number | string;
  balance_after?: number | string;
  status?: string;
  title?: string;
  detail?: string;
}

interface WalletTxResponse {
  data?: {
    items?: WalletTxItem[];
    summary?: {
      count?: number;
      total_credit_amount?: number | string;
      total_debit_amount?: number | string;
      net_amount?: number | string;
    };
    pagination?: {
      page?: number;
      limit?: number;
      total?: number;
      has_more?: boolean;
    };
  };
}

const TRANSACTION_TYPES = new Set<TransactionType>([
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
]);

function normalizeTxType(raw: string | undefined): TransactionType {
  const value = (raw ?? '').toLowerCase();
  return TRANSACTION_TYPES.has(value as TransactionType) ? (value as TransactionType) : 'other';
}

function normalizeTxStatus(raw: string | undefined): TransactionStatus {
  const value = (raw ?? '').toUpperCase();
  if (value === 'SUCCESS' || value === 'COMPLETED' || value === '1') return 'success';
  if (value === 'PENDING' || value === 'WAIT' || value === '0') return 'pending';
  if (value === 'FAILED') return 'failed';
  return 'cancelled';
}

function normalizeTxItem(row: WalletTxItem, index: number): Transaction {
  const direction: TransactionDirection =
    (row.direction ?? '').toUpperCase() === 'CREDIT' ? 'credit' : 'debit';
  const amount = Math.abs(Number(row.amount ?? 0));
  const signedMajor =
    row.signed_amount !== undefined
      ? Number(row.signed_amount)
      : direction === 'credit'
        ? amount
        : -amount;
  const id = String(row.id ?? index + 1);

  return {
    id,
    reference: id,
    type: normalizeTxType(row.type),
    direction,
    status: normalizeTxStatus(row.status),
    title: row.title || row.type_label || row.type || '',
    detail: row.detail || undefined,
    amount: toMinor(amount),
    signedAmount: toMinor(signedMajor),
    balanceAfter: row.balance_after !== undefined ? toMinor(Number(row.balance_after)) : null,
    note: row.detail || undefined,
    createdAt: row.created_at ?? '',
    completedAt: null,
  };
}

function normalizeTransactions(payload: WalletTxResponse): TransactionHistoryPage {
  const d = payload.data;
  const items = (d?.items ?? []).map(normalizeTxItem);
  const summary = d?.summary;
  const pagination = d?.pagination;

  return {
    items,
    summary: {
      count: Number(summary?.count ?? items.length),
      totalCredit: toMinor(Number(summary?.total_credit_amount ?? 0)),
      totalDebit: toMinor(Number(summary?.total_debit_amount ?? 0)),
      netAmount: toMinor(Number(summary?.net_amount ?? 0)),
    },
    page: Number(pagination?.page ?? 1),
    pageSize: Number(pagination?.limit ?? 20),
    total: Number(pagination?.total ?? items.length),
    hasMore: Boolean(pagination?.has_more),
  };
}

export const walletApi = {
  transactions: (
    params: {
      type?: TransactionType | 'all';
      dateStart?: string;
      dateStop?: string;
      page?: number;
    } = {},
  ) =>
    apiFetch<WalletTxResponse>('wallet/transactions', {
      query: {
        type: params.type,
        date_start: params.dateStart,
        date_stop: params.dateStop,
        page: params.page,
      },
    }).then(normalizeTransactions),

  // `API_ENDPOINTS.md` §7: the real path is singular (`/wallet/withdraw`), not
  // `/wallet/withdrawals` — the plural form 404s against the live backend.
  // The documented body is `{ amount }` only (as a string) — the member has
  // exactly one linked bank account on this backend, so there's nothing to
  // select; `bankAccountId` stays on the call signature for the UI's own
  // display purposes but isn't sent.
  withdraw: (payload: { amount: number; bankAccountId: string }) =>
    apiFetch<{ success?: boolean; message?: string }>('wallet/withdraw', {
      method: 'POST',
      body: { amount: String(toMajor(payload.amount)) },
      idempotencyKey: newIdempotencyKey(),
    }).then(assertSuccess),

  // `API_ENDPOINTS.md` §9: `source` is one of bonus | cashback | faststart | ic.
  // The response shape isn't documented — read defensively, same as balance.
  // A business-rule rejection (e.g. "nothing to claim") comes back as HTTP 200
  // with `success: false`, same as `promotion/select` — `assertSuccess` throws
  // on that so the caller's `onError` sees it like any other failure.
  claim: (source: BonusSource) =>
    apiFetch<{
      success?: boolean;
      message?: string;
      data?: { claimed?: number | string; balance?: number | string };
    }>('wallet/claim', {
      method: 'POST',
      body: { source },
      idempotencyKey: newIdempotencyKey(),
    })
      .then(assertSuccess)
      .then((res) => ({
        claimed: toMinor(Number(res.data?.claimed ?? 0)),
        balance: toMinor(Number(res.data?.balance ?? 0)),
      })),
};

/* --------------------------------- deposit -------------------------------- */

// Verified live against `POST deposit/loadbank`. `bank` comes back as either
// a plain array or an object keyed by an index/code, depending on channel.
interface LoadBankEntry {
  acc_no?: string;
  acc_name?: string;
  bank_name?: string;
  bank_pic?: string;
  qr_pic?: string;
  qrcode?: boolean;
  code?: number | string;
  deposit_min?: number | string;
  remark?: string;
}
interface LoadBankAccountsResponse {
  success?: boolean;
  message?: string;
  bank?: LoadBankEntry[] | Record<string, LoadBankEntry>;
}

function normalizeDepositAccounts(payload: LoadBankAccountsResponse): DepositChannel[] {
  const raw = payload.bank;
  // `bank` comes back in three different shapes depending on the channel: an
  // array, a dict keyed by index/code, or — when there's exactly one account
  // (e.g. the `slip` channel) — the account object itself, unwrapped.
  const entries: LoadBankEntry[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? 'acc_no' in raw
        ? [raw as LoadBankEntry]
        : Object.values(raw as Record<string, LoadBankEntry>)
      : [];

  return entries
    .filter((entry): entry is LoadBankEntry => !!entry?.acc_no)
    .map((entry, i) => ({
      id: String(entry.code ?? entry.acc_no ?? i),
      bankName: entry.bank_name ?? '',
      bankLogoUrl: entry.bank_pic || undefined,
      accountNumber: entry.acc_no ?? '',
      accountName: entry.acc_name ?? '',
      qrImageUrl: entry.qrcode && entry.qr_pic ? entry.qr_pic : undefined,
      minAmount: toMinor(Number(entry.deposit_min ?? 0)),
      remark: entry.remark || undefined,
    }));
}

interface PaymentProviderEntry {
  id?: string;
  name?: string;
  min_deposit?: number | string;
  payment_url?: string;
  remark?: string;
}
interface LoadPaymentResponse {
  success?: boolean;
  bank?: Record<string, PaymentProviderEntry>;
}

function normalizePaymentProviders(payload: LoadPaymentResponse): DepositPaymentProvider[] {
  return Object.values(payload.bank ?? {})
    .filter((entry): entry is PaymentProviderEntry => !!entry?.id)
    .map((entry) => ({
      id: entry.id as string,
      name: entry.name ?? '',
      minAmount: toMinor(Number(entry.min_deposit ?? 0)),
      remark: entry.remark || undefined,
    }));
}

/** `payment_url` is the backend's own routing key for a provider — opaque to us, forwarded verbatim on create. */
function extractPaymentUrls(payload: LoadPaymentResponse): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of Object.values(payload.bank ?? {})) {
    if (entry?.id && entry.payment_url) out[entry.id] = entry.payment_url;
  }
  return out;
}

export interface DepositPaymentSession {
  requestId: string;
  txid?: string;
  qrImageUrl?: string;
  amount: Minor;
  status: string;
  /** When the QR expires, as an epoch ms timestamp — parsed from `expired_date`. */
  expiresAtMs?: number;
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

// Some providers (e.g. Flashpay, live-verified) return neither `request_id`
// nor a QR inline — only a `url` pointing at the qrcode endpoint, with the
// request id as its last path segment. Same fallback as lotto-seed-app's
// `pickRequestId`.
function pickRequestIdFromUrl(url: unknown): string | undefined {
  if (typeof url !== 'string' || !url) return undefined;
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  return path.split('/').filter(Boolean).pop() || undefined;
}

// lotto-seed-app's `expired_date` comes back as `YYYY-MM-DD HH:mm:ss` (no
// timezone — treated as local time) or occasionally full ISO; parse both.
function parseExpiredDate(raw: unknown): number | undefined {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return undefined;

  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime();
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isPaidLikeStatus(status: string): boolean {
  const words = status.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.includes('paid') || words.includes('success') || words.includes('complete');
}

export function isExpiredStatus(status: string): boolean {
  const words = status.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.includes('expired') || words.includes('expire');
}

// Neither `deposit/create` nor `deposit/status`'s response shape is
// documented — read every plausible field name defensively so an
// unexpected payload degrades to "no QR yet" instead of throwing.
function normalizePaymentSession(payload: unknown, fallbackAmount: Minor): DepositPaymentSession {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;

  return {
    requestId: String(
      data.request_id
        ?? data.requestId
        ?? data.txid
        ?? data.tx_id
        ?? data.transaction_id
        ?? data.order_id
        ?? data.orderId
        ?? data.ref
        ?? data.reference
        ?? data.qr_id
        ?? data.id
        ?? pickRequestIdFromUrl(data.url)
        ?? '',
    ),
    txid: pickString(data.txid) ?? pickString(data.tx_id),
    qrImageUrl:
      pickString(data.qr_pic)
      ?? pickString(data.qr_image)
      ?? pickString(data.qrcode_url)
      ?? pickString(data.qr_code)
      ?? pickString(data.qr_url)
      ?? pickString(data.image)
      ?? pickString(data.qrcode),
    amount: data.amount !== undefined ? toMinor(Number(data.amount)) : fallbackAmount,
    status: String(data.status ?? 'pending'),
    expiresAtMs: parseExpiredDate(data.expired_date ?? data.expiredDate ?? data.expires_at ?? data.expiresAt),
  };
}

function fetchQrcode(providerId: string, requestId: string) {
  return apiFetch<unknown>(`${providerId}/qrcode/${requestId}`).then((res) =>
    normalizePaymentSession(res, 0),
  );
}

function pickRawUrl(payload: unknown): string | undefined {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;
  return pickString(data.url);
}

// `.../{id}/qrcode/{requestId}` is our own backend's JSON endpoint (proxied,
// authenticated) — anything else (verified live: Wealthpay hands back a
// third-party image URL like `.../payment/qr/{id}?amount=...`) serves the QR
// as a plain image and can be used directly as an `<img src>`.
function isJsonQrEndpoint(url: string): boolean {
  try {
    return new URL(url).pathname.includes('/qrcode/');
  } catch {
    return url.includes('/qrcode/');
  }
}

export const depositApi = {
  /** `bank` / `tw` / `slip` all return one or more destination accounts to transfer into. */
  accounts: (method: Exclude<DepositMethod, 'payment'>) =>
    apiFetch<LoadBankAccountsResponse>('deposit/loadbank', {
      method: 'POST',
      body: { method },
    }).then(normalizeDepositAccounts),

  paymentProviders: () =>
    apiFetch<LoadPaymentResponse>('deposit/loadbank', {
      method: 'POST',
      body: { method: 'payment' },
    }).then((res) => ({
      providers: normalizePaymentProviders(res),
      paymentUrls: extractPaymentUrls(res),
    })),

  // `API_ENDPOINTS.md` §6: the backend destination for all four of these is
  // `/{id}/...` with NO `payment/` prefix — that prefix only exists on
  // lotto-seed-app's own Next.js route (`/api/payment/[id]/...`), which
  // forwards to `payment_url`; verified live (the prefixed path 404s).
  // Some providers return the QR straight off `deposit/create`; others only
  // hand back a `request_id` and expect a follow-up `GET .../qrcode/{id}` —
  // matches lotto-seed-app's two-step fallback.
  createPayment: (providerId: string, paymentUrl: string, amountMajor: number) =>
    apiFetch<{ success?: boolean; message?: string }>(`${providerId}/deposit/create`, {
      method: 'POST',
      body: { amount: amountMajor, payment_url: paymentUrl },
      idempotencyKey: newIdempotencyKey(),
    })
      .then(assertSuccess)
      .then(async (res) => {
        const session = normalizePaymentSession(res, toMinor(amountMajor));
        if (session.qrImageUrl) return session;

        const rawUrl = pickRawUrl(res);
        if (!rawUrl) return session;

        // A third-party image URL (Wealthpay et al) — render it directly.
        if (!isJsonQrEndpoint(rawUrl)) return { ...session, qrImageUrl: rawUrl };

        // Our own backend's JSON endpoint — fetch it through the proxy.
        if (!session.requestId) return session;
        const qr = await fetchQrcode(providerId, session.requestId);
        return qr.qrImageUrl ? { ...session, ...qr } : session;
      }),

  paymentStatus: (providerId: string, requestId: string) =>
    apiFetch<unknown>(`${providerId}/deposit/status/${requestId}`).then((res) =>
      normalizePaymentSession(res, 0),
    ),

  expirePayment: (providerId: string, requestId: string) =>
    apiFetch<{ success?: boolean; message?: string }>(
      `${providerId}/deposit/expire/${requestId}`,
      { method: 'POST' },
    ).then(assertSuccess),

  qrcode: (providerId: string, requestId: string) => fetchQrcode(providerId, requestId),
};

/* -------------------------------- promotions ----------------------------- */

interface PromotionListResponse {
  data?: PromotionEntry[] | { promotions?: PromotionEntry[] };
}
// Verified live against `GET promotion/list` — the entry has no `claimed`/
// `is_selected` flag at all; which promotion (if any) is active lives on the
// member profile instead (`pro`/`pro_name`), matched by title in the view.
interface PromotionEntry {
  code?: number | string;
  id?: number | string;
  name_th?: string;
  content?: string;
  filepic?: string;
  bonus_percent?: number | string;
  turnpro?: number | string;
  amount_min?: number | string;
  active?: number | boolean | string;
  enable?: number | boolean | string;
}

// Ported from lotto-seed-app's `PromotionPanel.tsx`/`PromotionPageClient.tsx`
// `HIDE_PROMO_BUTTON_IDS` — these promo `id` slugs are auto-applied by the
// backend rather than member-claimed, so their claim button is hidden entirely.
const HIDE_CLAIM_BUTTON_IDS = new Set([
  'pro_cashback',
  'pro_ic',
  'pro_faststart',
  'pro_spin',
  'pro_coupon',
]);

/** Backend flags come back as "Y"/"N" strings here, not 0/1 or true/false. */
function isFlagTrue(value: number | boolean | string | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === 'string') return value.toUpperCase() === 'Y' || value === '1';
  return !!Number(value);
}

/** `content` is rich HTML from the promo CMS — strip tags for the plain-text card description. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePromotions(payload: PromotionListResponse): Promotion[] {
  const list = Array.isArray(payload.data)
    ? payload.data
    : (payload.data?.promotions ?? []);

  return list.map((p) => ({
    id: String(p.code ?? p.id ?? ''),
    title: p.name_th ?? '',
    description: stripHtml(p.content ?? ''),
    imageUrl: p.filepic || undefined,
    badge: Number(p.bonus_percent ?? 0) > 0 ? `+${p.bonus_percent}%` : undefined,
    minDeposit: toMinor(Number(p.amount_min ?? 0)),
    bonusPercent: Number(p.bonus_percent ?? 0),
    turnoverMultiplier: Number(p.turnpro ?? 1),
    startsAt: null,
    endsAt: null,
    // Resolved against the member profile's active-promo name in the view —
    // this list alone can't say which promotion (if any) is claimed.
    claimed: false,
    claimable: isFlagTrue(p.active) && isFlagTrue(p.enable),
    hideClaimButton: HIDE_CLAIM_BUTTON_IDS.has(String(p.id ?? '').trim().toLowerCase()),
    terms: [],
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
    apiFetch<{ success?: boolean; message?: string }>('promotion/select', {
      method: 'POST',
      body: { promotion: id },
      idempotencyKey: newIdempotencyKey(),
    }).then(assertSuccess),
  // `API_ENDPOINTS.md` §8: no body.
  deselect: () =>
    apiFetch<{ success?: boolean; message?: string }>('promotion/deselect', {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    }).then(assertSuccess),
};

/* --------------------------------- referral ------------------------------ */

// `GET member/contributor` — verified against lotto-seed-app's own working
// referral page (its `/api/referral` route is dead legacy code, never
// actually called; the real page hits this endpoint directly).
interface ContributorResponse {
  success?: boolean;
  more_message?: string | null;
  summary?: ContributorSummaryFields;
  rule?: ContributorRuleFields;
  referrals?: ContributorReferralRow[];
  data?: {
    more_message?: string | null;
    summary?: ContributorSummaryFields;
    rule?: ContributorRuleFields;
    referrals?: ContributorReferralRow[];
  };
}
interface ContributorSummaryFields {
  referred_members?: number | string;
  referral_code?: string;
  referral_income?: number | string;
  promotion_bonus_income?: number | string;
  promotion_bonus_count?: number | string;
}
interface ContributorRuleFields {
  bonus_percent?: number | string;
  bonus_price?: number | string;
  display_value?: string | null;
  more_message?: string | null;
}
interface ContributorReferralRow {
  id?: number | string;
  totalEarned?: number | string;
  total_earned?: number | string;
  createdAt?: string;
  created_at?: string;
  phone?: string;
  display_name?: string | null;
  name?: string | null;
  referee?: {
    displayName?: string | null;
    display_name?: string | null;
    phone?: string;
    createdAt?: string;
    created_at?: string;
  };
}

function normalizeReferral(payload: ContributorResponse): {
  summary: ReferralSummary;
  friends: ReferralFriend[];
} {
  const summary = payload.summary ?? payload.data?.summary ?? {};
  const rule = payload.rule ?? payload.data?.rule;
  const rows = payload.referrals ?? payload.data?.referrals ?? [];
  const num = (v: number | string | undefined) => (v === undefined ? 0 : Number(v));
  const moreMessage = String(
    rule?.more_message ?? payload.more_message ?? payload.data?.more_message ?? '',
  ).trim();

  return {
    summary: {
      code: (summary.referral_code ?? '').trim(),
      referredCount: num(summary.referred_members),
      totalEarned: toMinor(num(summary.referral_income)),
      promotionBonusIncome: toMinor(num(summary.promotion_bonus_income)),
      promotionBonusCount: num(summary.promotion_bonus_count),
      moreMessage,
      rule: rule
        ? {
            bonusPercent: num(rule.bonus_percent),
            bonusPrice: toMinor(num(rule.bonus_price)),
            displayValue: rule.display_value || null,
          }
        : null,
    },
    friends: rows.map((r, i) => ({
      id: String(r.id ?? i),
      name: r.referee?.displayName ?? r.referee?.display_name ?? r.display_name ?? r.name ?? null,
      phone: r.referee?.phone ?? r.phone ?? '',
      joinedAt: r.createdAt ?? r.created_at ?? r.referee?.createdAt ?? r.referee?.created_at ?? '',
      earned: toMinor(num(r.totalEarned ?? r.total_earned)),
    })),
  };
}

export const referralApi = {
  contributor: () =>
    apiFetch<ContributorResponse>('member/contributor').then(normalizeReferral),
};

/* --------------------------------- contact ------------------------------- */

// `GET meta/contact-channels` — verified against lotto-seed-app's
// `getContactChannels()`, which is guest-accessible (no token required).
interface ContactChannelsResponse {
  success?: boolean;
  data?: { contact_channels?: ContactChannel[] };
}

export const contactApi = {
  channels: () =>
    apiFetch<ContactChannelsResponse>('meta/contact-channels')
      .then((payload) => (payload.data?.contact_channels ?? []).slice().sort((a, b) => a.sort - b.sort))
      .catch((error) => {
        if (error instanceof ApiError && error.isUnauthorized) return [];
        throw error;
      }),
};

/* ------------------------------ lucky wheel ------------------------------ */

interface WheelListResponse {
  success?: boolean;
  data?: {
    wheel?: WheelListEntry[];
    enabled?: boolean;
  };
}
interface WheelListEntry {
  code: number;
  fillStyle: string;
  image: string;
  text: string;
  amount: string;
  name: string;
  types: string;
}

interface WheelSpinResponse {
  success?: boolean;
  diamond?: number;
  message?: string;
  format?: {
    title?: string;
    msg?: string;
    img?: string;
    point?: number;
    diamond?: number;
  };
}

interface WheelHistoryResponse {
  success?: boolean;
  data?: {
    history?: Array<{ date: string; data: WheelHistoryItem[] }>;
  };
}

function normalizeWheelList(payload: WheelListResponse): {
  segments: WheelSegment[];
  enabled: boolean;
} {
  const wheel = payload.data?.wheel ?? [];
  return {
    enabled: payload.data?.enabled ?? true,
    segments: wheel.map((item) => ({
      code: item.code,
      fillStyle: item.fillStyle,
      imageUrl: item.image,
      label: item.text,
      prize: parseFloat(item.amount) || 0,
      name: item.name,
      types: item.types,
    })),
  };
}

function normalizeWheelSpin(payload: WheelSpinResponse): WheelSpinResult {
  const fmt = payload.format ?? {};
  return {
    point: fmt.point,
    diamond: fmt.diamond ?? payload.diamond,
    title: fmt.title,
    msg: fmt.msg,
    imageUrl: fmt.img,
  };
}

/** Merges history groups sharing the same date, same as lotto-seed-app's `SpinHistoryRoute`. */
function normalizeWheelHistory(payload: WheelHistoryResponse): WheelHistoryGroup[] {
  const raw = payload.data?.history ?? [];
  const map = new Map<string, WheelHistoryItem[]>();
  for (const group of raw) {
    const existing = map.get(group.date);
    if (existing) existing.push(...group.data);
    else map.set(group.date, [...group.data]);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export const wheelApi = {
  list: () => apiFetch<WheelListResponse>('wheel/list').then(normalizeWheelList),
  spin: () =>
    apiFetch<WheelSpinResponse>('wheel/spin', {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    }).then(normalizeWheelSpin),
  history: () => apiFetch<WheelHistoryResponse>('wheel/history').then(normalizeWheelHistory),
};

/* ---------------------------------- games --------------------------------- */

// `GET games/types` / `GET games/providers/{typeId}` / `POST games/login` —
// per API_ENDPOINTS.md §13, verified against lotto-seed-app's `lib/api/games.ts`.
interface GameTypesResponse {
  success?: boolean;
  data?: ApiGameType[];
}
interface ApiGameType {
  id: string;
  name: string;
  status_open: string;
}

interface GameProvidersResponse {
  success?: boolean;
  data?: ApiProviderRow[] | { providers?: ApiProviderRow[] };
}
interface ApiProviderRow {
  provider: string;
  providerName: string;
  logoURL?: string;
  status?: string;
}

interface GamesByProviderResponse {
  success?: boolean;
  data?: ApiGameRow[];
}
interface ApiGameRow {
  id: string;
  provider: string;
  gameName: string;
  image?: { vertical?: string; horizontal?: string; banner?: string };
  status: string;
}

interface GameLoginResponse {
  success?: boolean;
  data?: { url?: string };
  message?: string;
}

// `card`/`poker`/`keno` are three separate backend types merged into a single
// CARDGROUP section — ported from lotto-seed-app's `CARD_GROUP_IDS`.
const CARD_GROUP_IDS = ['card', 'poker', 'keno'];
const GAME_TYPE_ORDER = ['SLOT', 'CASINO', 'SPORT', 'CARDGROUP', 'COCK', 'FISH'];

function extractProviderRows(data: GameProvidersResponse['data']): ApiProviderRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.providers ?? [];
}

function normalizeProviders(rows: ApiProviderRow[], gameType: string): GameProvider[] {
  return rows
    .filter((p) => !p.status || p.status === 'ACTIVE')
    .map((p) => ({
      id: p.provider,
      name: p.providerName,
      imageUrl: p.logoURL ?? '',
      gameType,
    }));
}

export const gamesApi = {
  /** One category per open game type, `card`/`poker`/`keno` merged into `CARDGROUP`. */
  categories: async (): Promise<GameCategory[]> => {
    const typesRes = await apiFetch<GameTypesResponse>('games/types');
    const openTypes = (typesRes.data ?? []).filter((t) => t.status_open === 'Y');
    if (openTypes.length === 0) return [];

    const results = await Promise.allSettled(
      openTypes.map((t) =>
        apiFetch<GameProvidersResponse>(`games/providers/${t.id}`).then((res) => ({
          typeId: t.id,
          providers: extractProviderRows(res.data),
        })),
      ),
    );

    const merged = new Map<string, GameProvider[]>();
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { typeId, providers } = r.value;
      const groupKey = CARD_GROUP_IDS.includes(typeId.toLowerCase())
        ? 'CARDGROUP'
        : typeId.toUpperCase();
      const list = merged.get(groupKey) ?? [];
      list.push(...normalizeProviders(providers, typeId.toLowerCase()));
      merged.set(groupKey, list);
    }

    return Array.from(merged.entries())
      .filter(([, providers]) => providers.length > 0)
      .map(([type, providers]) => ({ type, providers }))
      .sort((a, b) => {
        const ai = GAME_TYPE_ORDER.indexOf(a.type);
        const bi = GAME_TYPE_ORDER.indexOf(b.type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  },

  /** All providers under one category — `type` is a `GameCategory.type` (e.g. `CARDGROUP`). */
  providersByType: async (type: string): Promise<GameProvider[]> => {
    const typeId = type.toLowerCase();
    if (typeId === 'cardgroup') {
      const results = await Promise.allSettled(
        CARD_GROUP_IDS.map((id) =>
          apiFetch<GameProvidersResponse>(`games/providers/${id}`).then((res) => ({
            typeId: id,
            providers: extractProviderRows(res.data),
          })),
        ),
      );
      return results.flatMap((r) =>
        r.status === 'fulfilled' ? normalizeProviders(r.value.providers, r.value.typeId) : [],
      );
    }
    const res = await apiFetch<GameProvidersResponse>(`games/providers/${typeId}`);
    return normalizeProviders(extractProviderRows(res.data), typeId);
  },

  gamesByProvider: (type: string, providerId: string) =>
    apiFetch<GamesByProviderResponse>(`games/${type.toLowerCase()}/${providerId}`).then((res) =>
      (res.data ?? [])
        .filter((g) => g.status === 'ACTIVE')
        .map(
          (g): GameItem => ({
            id: g.id,
            provider: g.provider,
            name: g.gameName,
            imageUrl: g.image?.vertical,
            active: true,
          }),
        ),
    ),

  /** Returns the launch URL for one game, or throws if the backend has none. */
  login: (providerId: string, gameId: string) =>
    apiFetch<GameLoginResponse>('games/login', {
      method: 'POST',
      body: { id: providerId, game: gameId },
    }).then((res) => {
      const url = res.data?.url;
      if (!url) throw new ApiError(200, { message: res.message || 'No launch URL returned' });
      return url;
    }),
};
