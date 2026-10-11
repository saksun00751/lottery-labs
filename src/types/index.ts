/* =========================================================================
 *  Domain model — mirrors the backend contract documented in docs/API.md.
 *  All monetary values are integers in the smallest unit (สตางค์ / cents)
 *  so no float rounding ever touches a balance.
 * ========================================================================= */

export type Minor = number;

export interface Bank {
  code: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl?: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  username: string;
  phone: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  createdAt: string;
  bankAccounts: BankAccount[];
  /** Title of the promotion currently claimed on this account, if any. */
  activePromotionName: string | null;
}

export interface Wallet {
  balance: Minor;
  diamond: number;
  /** คืนยอดเสีย — cashback available to claim. */
  cashback: Minor;
  /** ยอดเดือนนี้ — net turnover for the current month. */
  monthlyTurnover: Minor;
  currency: string;
  updatedAt: string;
}

/** The four claimable bonus pools on `member/loadbalance`, matching `wallet/claim`'s `source`. */
export type BonusSource = 'bonus' | 'cashback' | 'faststart' | 'ic';

/** Claimable balances shown on the `/bonus` page — `member/loadbalance`'s bonus fields. */
export interface BonusSummary {
  bonus: Minor;
  cashback: Minor;
  faststart: Minor;
  ic: Minor;
}

/** Withdrawal eligibility for a promotion currently claimed on the account. */
export interface WithdrawPromoInfo {
  active: boolean;
  name: string | null;
  /** Balance the member must reach before a withdrawal is allowed. */
  turnoverRequired: Minor;
  /** Once turnover is cleared, a withdrawal is forced to exactly this amount. */
  withdrawLimit: Minor;
}

/** Everything the withdraw page needs beyond the wallet balance itself. */
export interface WithdrawInfo {
  canWithdraw: boolean;
  notice: string | null;
  min: Minor;
  max: Minor;
  maxPerDay: Minor;
  sumToday: Minor;
  remainToday: Minor;
  bankAccount: { bankCode: string; accountNumber: string; accountName: string } | null;
  promo: WithdrawPromoInfo;
}

/* --------------------------------- Lottery ------------------------------ */

export type LotteryCategory =
  | 'government'
  | 'yeekee'
  | 'foreign'
  | 'stock'
  | 'hanoi'
  | 'laos';

export type RoundStatus = 'open' | 'closing' | 'closed' | 'settled';

/** Group-level summary (e.g. หวยไทย/หวยต่างประเทศ) shown on the home page's shortcut section. */
export interface LotteryGroupSummary {
  id: string;
  groupId: number;
  category: LotteryCategory;
  name: string;
  description?: string;
  logoUrl?: string;
  openCount: number;
  totalCount: number;
}

export interface LotteryRound {
  id: string;
  /** i18n key or plain name returned by the API. */
  name: string;
  category: LotteryCategory;
  /** Real backend group code (e.g. `lotto-daily`) — more precise than `category`, used for filtering. */
  groupCode?: string;
  /** Real backend group name (e.g. "หวยรายวัน"), used as the filter tab label when present. */
  groupName?: string;
  /** Numeric group id — what the package-selection endpoints key off. */
  groupId?: number;
  /** Flag/emblem shown on the card. */
  iconUrl?: string;
  status: RoundStatus;
  /** ISO timestamp when betting closes. Drives the countdown. */
  closesAt: string;
  /** ISO timestamp when results are announced. */
  drawsAt: string;
  /** Round label, e.g. "16/08/2569" or "รอบที่ 42". */
  label: string;
  betTypes: BetTypeId[];
  /** Present only once the round has been drawn (`status === 'settled'`). */
  result?: { top3?: string; bottom2?: string };
  /** The specific draw instance's numeric id — what `POST /lotto/bet` needs, distinct from `id` (the market id). */
  drawId?: number;
}

export type BetTypeId =
  | '3top' // 3 ตัวบน
  | '3tod' // 3 ตัวโต๊ด
  | '3bottom' // 3 ตัวล่าง
  | '2top' // 2 ตัวบน
  | '2bottom' // 2 ตัวล่าง
  | 'run_top' // วิ่งบน
  | 'run_bottom'; // วิ่งล่าง

export interface BetType {
  id: BetTypeId;
  /** Number of digits the player picks. */
  digits: 1 | 2 | 3;
  /** Payout multiplier, e.g. 900 means 1 ฿ returns 900 ฿. */
  payout: number;
  minStake: Minor;
  maxStake: Minor;
  /** ส่วนลด — set once the member's selected package overrides this bet type. */
  discountPercent?: number;
}

/** เลขอั้น — a number either closed outright, or capped at a max stake. */
export interface RestrictedNumber {
  betType: BetTypeId;
  number: string;
  closed: boolean;
  /** Highest stake still accepted when not closed; `null` when closed or uncapped. */
  maxAmount: Minor | null;
}

export interface RoundRates {
  roundId: string;
  betTypes: BetType[];
  restricted: RestrictedNumber[];
  /** `bet_profile.code` from betting-context — `hanoi_abcd_v1` switches the page to the Hanoi board. */
  betProfile?: string;
  /** Present only when `betProfile` is the Hanoi A/B/C/D profile. */
  hanoi?: HanoiCapability;
}

/* --------------------------- Hanoi A/B/C/D profile ------------------------- */

export type HanoiChannel = 'A' | 'B' | 'C' | 'D' | 'ABCD';
export type HanoiDigits = 2 | 3;
export type HanoiMethod = 'straight' | 'mix' | 'cross' | 'range';

export interface HanoiCapability {
  /** Which channels the draw accepts, per digit count — drives every disabled chip. */
  channelsByDigits: Record<HanoiDigits, Record<HanoiChannel, boolean>>;
  methods: Record<HanoiDigits, HanoiMethod[]>;
  /** Per-bet-type (`hanoi_a2`…`hanoi_d3`) stake limits and payout, from `limits.bet_types`. */
  limits: Record<string, { minStake: Minor; maxStake: Minor; payout: number }>;
}

/** One line the member builds. Numbers stay strings so leading zeros survive. */
export interface HanoiSelection {
  channel: HanoiChannel;
  digits: HanoiDigits;
  method: HanoiMethod;
  number?: string;
  left?: string;
  right?: string;
  rangeStart?: string;
  rangeEnd?: string;
  /** Baht per unit, before multiplying by numbers and positions. */
  amount: number;
}

export interface HanoiQuote {
  totalBet: Minor;
  totalDiscount: Minor;
  totalNet: Minor;
  totalUnits: number;
  expandedNumberCount: number;
  /** Sum of `potential_win_amount` across every bet type, when the server sends it. */
  potentialWin: Minor;
  /** Net per selection, in request order. */
  selectionNet: Minor[];
}

export interface HanoiBetResult {
  ticketId: string;
  totalNet: Minor;
}

/** A payout-rate tier a member picks per lottery group before betting. */
export interface LotteryPackage {
  id: number;
  name: string;
  imageUrl?: string;
  discountPercent?: number;
  /** Per-bet-type payout/discount overrides this package applies once selected. */
  betSettings?: Array<{ betType: BetTypeId; payout: number; discountPercent: number }>;
}

/** One line in the bet slip before submission. */
export interface BetEntry {
  /** Client-side id so React keys stay stable. */
  key: string;
  betType: BetTypeId;
  number: string;
  stake: Minor;
  payout: number;
}

export type TicketStatus = 'pending' | 'won' | 'lost' | 'void' | 'refunded';

/** Hanoi A/B/C/D bet type codes as stored on a ticket, e.g. `hanoi_a2`. */
export type HanoiBetTypeId = `hanoi_${'a' | 'b' | 'c' | 'd'}${2 | 3}`;

/** What a Hanoi ticket line records beyond the number: how it was picked and how many units it covers. */
export interface HanoiTicketItem {
  method: HanoiMethod;
  /** What the member entered (e.g. `123` for a mix, `12×34` for a cross). */
  source: string;
  unitAmount: number;
  unitCount: number;
  /** Positions that hit once the draw is settled. */
  matchedUnits?: number;
}

export interface TicketItem {
  betType: BetTypeId | HanoiBetTypeId;
  number: string;
  stake: Minor;
  payout: number;
  status: TicketStatus;
  winAmount: Minor;
  /** Set only on Hanoi A/B/C/D lines. */
  hanoi?: HanoiTicketItem;
}

/**
 * โพยหวย — a submitted slip. `GET /lotto/tickets` (the list) only ever
 * returns this summary shape; the numbered items only come back from
 * `GET /lotto/tickets/{id}` — see `TicketDetail`.
 */
export interface Ticket {
  id: string;
  reference: string;
  roundId: string;
  roundName: string;
  roundLabel: string;
  iconUrl?: string;
  groupName?: string;
  createdAt: string;
  status: TicketStatus;
  itemCount: number;
  totalStake: Minor;
  totalWin: Minor;
}

/** Full slip detail, including every number bet — fetched per-ticket on demand. */
export interface TicketDetail extends Ticket {
  totalDiscount: Minor;
  totalNet: Minor;
  items: TicketItem[];
}

/** One market's latest (or searched-date) draw, as shown on the results-check page. */
export interface ResultMarket {
  marketId: number;
  /** Matches `Ticket.roundId` — lets the check-result modal find the member's own slips for this draw. */
  drawId?: number;
  marketName: string;
  iconUrl?: string;
  /** e.g. "23/08/2569". */
  drawLabel: string;
  hasResult: boolean;
  /** Keyed by bet type — e.g. `{ '3top': '482', '2bottom': '15' }`. */
  numbers: Partial<Record<BetTypeId, string>>;
}

/** A lottery group (หวยไทย/หวยต่างประเทศ/...) with its markets' latest results. */
export interface ResultGroup {
  groupCode: string;
  groupName: string;
  description?: string;
  markets: ResultMarket[];
}

/* ------------------------------- Yeekee ---------------------------------- */

export type YeekeeRoundStatus = 'open' | 'closed' | 'resulted' | 'voided';

export interface YeekeeRound {
  id: string;
  marketId: string;
  roundNo: number;
  betOpensAt: string;
  betClosesAt: string;
  shootOpensAt: string;
  shootClosesAt: string;
  resultComputeAt: string;
  status: YeekeeRoundStatus;
  isOpenForPlay: boolean;
  isFinal: boolean;
}

export interface YeekeeShoot {
  position: number;
  numberText?: string;
  isRevealed: boolean;
  memberNamePrefixMasked: string;
  submittedAt: string;
}

export interface YeekeeShootsPage {
  roundId: string;
  displayMode: string;
  isNumberRevealed: boolean;
  shootSum?: string;
  shootCount: number;
  items: YeekeeShoot[];
  pagination: {
    page: number;
    limit: number;
    count: number;
    total: number;
    hasMore: boolean;
  };
}

export interface YeekeeRewardTier {
  position: number;
  label: string;
  creditAmount: Minor;
}

export interface YeekeeRewardWinner extends YeekeeRewardTier {
  memberNamePrefixMasked: string;
  memberNameMasked: string;
  winnerCreditStatus: string;
  shoot: {
    numberText?: string;
    isRevealed: boolean;
    submittedAt: string;
  };
}

export interface YeekeeResultProof {
  roundId: string;
  roundNo: number;
  drawId: string;
  drawDate: string;
  status: string;
  isRevealed: boolean;
  shootSummary: {
    shootSum?: string;
    shootCount: number;
    shootSource: string;
  };
  rewardPolicy: YeekeeRewardTier[];
  rewardPolicyMeta: {
    rewardEnabled: boolean;
    currency: string;
  };
  winners: YeekeeRewardWinner[];
  proof: {
    formulaLabel: string;
    precommitSignature: string;
    proofSignature: string;
    externalSeedReference: string;
    resultTop3?: string;
    resultBottom2?: string;
    rawResult?: string;
  };
  serverTime: string;
}

/* --------------------------------- Money -------------------------------- */

// Mirrors lotto-seed-app's `wallet/transactions` tab set (`TAB_IDS` in
// `TransactionsPageClient.tsx`) — 'all' is a UI-only filter value, not a real type.
export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'lotto_bet'
  | 'lotto_refund'
  | 'referral'
  | 'cashback'
  | 'ic'
  | 'bonus'
  | 'game'
  | 'admin_adjust'
  | 'rollback'
  | 'other';
export type TransactionDirection = 'credit' | 'debit';
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  title: string;
  detail?: string;
  amount: Minor;
  /** Signed by direction — negative for a debit. Matches lotto-seed-app's `TxRow.signedAmount`. */
  signedAmount: Minor;
  balanceAfter: Minor | null;
  bankAccount?: Pick<BankAccount, 'bankCode' | 'bankName' | 'accountNumber'>;
  note?: string;
  createdAt: string;
  completedAt: string | null;
}

export interface TransactionSummary {
  count: number;
  totalCredit: Minor;
  totalDebit: Minor;
  netAmount: Minor;
}

export interface TransactionHistoryPage {
  items: Transaction[];
  summary: TransactionSummary;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** A destination account for the bank / TrueMoney / slip-upload deposit methods. */
export interface DepositChannel {
  id: string;
  bankName: string;
  bankLogoUrl?: string;
  accountNumber: string;
  accountName: string;
  /** Static scan-to-pay QR for this account, when the backend has one on file. */
  qrImageUrl?: string;
  minAmount: Minor;
  remark?: string;
}

export type DepositMethod = 'bank' | 'payment' | 'tw' | 'slip';

/** An online payment gateway offered under the "payment" deposit method. */
export interface DepositPaymentProvider {
  id: string;
  name: string;
  minAmount: Minor;
  remark?: string;
}

/* ------------------------------- Promotion ------------------------------ */

export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  /** e.g. "โบนัส 10%", displayed as a badge on the card. */
  badge?: string;
  minDeposit: Minor;
  bonusPercent: number;
  turnoverMultiplier: number;
  startsAt: string | null;
  endsAt: string | null;
  claimed: boolean;
  claimable: boolean;
  /** Backend-designated promo type (cashback/IC/fast-start/spin/coupon) whose claim button lotto-seed-app hides — these are informational-only entries. */
  hideClaimButton: boolean;
  terms: string[];
}

/* ------------------------------- Referral ------------------------------- */

/** The active commission rule, as returned by `GET member/contributor`. */
export interface ReferralRule {
  bonusPercent: number;
  bonusPrice: Minor;
  displayValue: string | null;
}

export interface ReferralSummary {
  code: string;
  referredCount: number;
  totalEarned: Minor;
  promotionBonusIncome: Minor;
  promotionBonusCount: number;
  /** Backend-supplied blurb describing the current commission terms. */
  moreMessage: string;
  rule: ReferralRule | null;
}

export interface ReferralFriend {
  id: string;
  /** `null` when the backend has no display name on file — fall back to a masked phone. */
  name: string | null;
  phone: string;
  joinedAt: string;
  earned: Minor;
}

/* -------------------------------- Contact -------------------------------- */

/** `type` drives the icon/color/label chosen client-side (`line`, `telegram`, or anything else). */
export interface ContactChannel {
  code: number;
  type: string;
  label: string;
  link: string;
  sort: number;
}

/* ---------------------------------- Games --------------------------------- */

/** A game provider (ค่ายเกม) within one category, e.g. "PG Soft" under SLOT. */
export interface GameProvider {
  id: string;
  name: string;
  imageUrl: string;
  /** Raw backend type id, lowercase (e.g. `card`, `poker`, `keno`) — distinct from the merged `GameCategory.type`. */
  gameType: string;
}

/**
 * One category section on the games hub — mirrors lotto-seed-app's `GameGroup`.
 * `card`/`poker`/`keno` are merged into a single `CARDGROUP` here, same as the reference.
 */
export interface GameCategory {
  type: string;
  providers: GameProvider[];
}

/** A single playable game offered by one provider. */
export interface GameItem {
  id: string;
  provider: string;
  name: string;
  imageUrl?: string;
  active: boolean;
}

/* ------------------------------- Lucky wheel ----------------------------- */

/** One slice of the lucky wheel — mirrors lotto-seed-app's `WheelSegment`. */
export interface WheelSegment {
  code: number;
  prize: number;
  label: string;
  imageUrl: string;
  fillStyle: string;
  name: string;
  types: string;
}

export interface WheelSpinResult {
  point?: number;
  diamond?: number;
  title?: string;
  msg?: string;
  imageUrl?: string;
}

export interface WheelHistoryItem {
  credit: string;
  time: string;
}

export interface WheelHistoryGroup {
  date: string;
  items: WheelHistoryItem[];
}

/* --------------------------------- API ---------------------------------- */

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorShape {
  code: string;
  /** Hanoi endpoints name their domain error `error_code` instead of `code`. */
  error_code?: string;
  message: string;
  fields?: Record<string, string>;
}
