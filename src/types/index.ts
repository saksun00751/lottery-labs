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

export interface TicketItem {
  betType: BetTypeId;
  number: string;
  stake: Minor;
  payout: number;
  status: TicketStatus;
  winAmount: Minor;
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

export interface DrawResult {
  roundId: string;
  roundName: string;
  roundLabel: string;
  drawnAt: string;
  /** Keyed by bet type — e.g. `{ '3top': '482', '2bottom': '15' }`. */
  numbers: Partial<Record<BetTypeId, string>>;
}

/* --------------------------------- Money -------------------------------- */

export type TransactionType = 'deposit' | 'withdraw' | 'bonus' | 'cashback';
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
  status: TransactionStatus;
  amount: Minor;
  balanceAfter: Minor | null;
  bankAccount?: Pick<BankAccount, 'bankCode' | 'bankName' | 'accountNumber'>;
  note?: string;
  createdAt: string;
  completedAt: string | null;
}

export interface DepositChannel {
  id: string;
  type: 'bank_transfer' | 'qr_promptpay' | 'truemoney';
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrPayload?: string;
  minAmount: Minor;
  maxAmount: Minor;
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
  terms: string[];
}

/* ------------------------------- Referral ------------------------------- */

export interface ReferralSummary {
  code: string;
  link: string;
  totalFriends: number;
  activeFriends: number;
  totalCommission: Minor;
  pendingCommission: Minor;
  commissionPercent: number;
}

export interface ReferralFriend {
  id: string;
  maskedName: string;
  joinedAt: string;
  turnover: Minor;
  commission: Minor;
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
  message: string;
  fields?: Record<string, string>;
}
