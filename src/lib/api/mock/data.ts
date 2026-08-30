import type {
  Bank,
  DepositChannel,
  DepositPaymentProvider,
  ContactChannel,
  LotteryRound,
  Promotion,
  RoundRates,
  Transaction,
  User,
  Wallet,
  WheelHistoryGroup,
  WheelSegment,
} from '@/types';

/**
 * Raw, backend-shaped slip fixture — mirrors what `lotto/tickets` and
 * `lotto/tickets/{id}` actually return, since the mock intercepts requests
 * below the client-side normalizers in `endpoints.ts` (see proxy route).
 */
export interface MockTicket {
  id: string;
  draw_id: string;
  market_name: string;
  status: string;
  created_at: string;
  item_count: number;
  total_bet_amount: number;
  total_win_amount: number;
  is_final: boolean;
  is_winner: boolean;
  items: Array<{
    bet_type: string;
    number: string;
    amount: number;
    payout_at_time: number;
    result_status: string | null;
    win_amount: number;
  }>;
}

/* =========================================================================
 *  In-memory fixtures used when NEXT_PUBLIC_USE_MOCK=true.
 *  Nothing here ships to the browser — it only runs inside the Route Handler.
 * ========================================================================= */

export const BANKS: Bank[] = [
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย', shortName: 'กสิกรไทย', color: '#138f2d' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', shortName: 'ไทยพาณิชย์', color: '#4e2e7f' },
  { code: 'BBL', name: 'ธนาคารกรุงเทพ', shortName: 'กรุงเทพ', color: '#1e4598' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย', shortName: 'กรุงไทย', color: '#1ba5e1' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', shortName: 'กรุงศรี', color: '#fec43b' },
  { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต', shortName: 'ทีทีบี', color: '#1279be' },
  { code: 'GSB', name: 'ธนาคารออมสิน', shortName: 'ออมสิน', color: '#eb198d' },
  { code: 'BAAC', name: 'ธนาคารเพื่อการเกษตรฯ', shortName: 'ธ.ก.ส.', color: '#4b9b1d' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบีไทย', shortName: 'ซีไอเอ็มบี', color: '#7e2f36' },
  { code: 'UOB', name: 'ธนาคารยูโอบี', shortName: 'ยูโอบี', color: '#0b3979' },
  { code: 'LHB', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', shortName: 'แลนด์ฯ', color: '#6d6e71' },
  { code: 'KKP', name: 'ธนาคารเกียรตินาคินภัทร', shortName: 'เกียรตินาคิน', color: '#199cc5' },
];

export const USER: User = {
  id: 'u_10024',
  username: 'demo_player',
  phone: '0812345678',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  referralCode: 'LL8K2M',
  createdAt: '2025-11-02T08:14:00.000Z',
  activePromotionName: null,
  bankAccounts: [
    {
      id: 'ba_1',
      bankCode: 'KBANK',
      bankName: 'ธนาคารกสิกรไทย',
      accountNumber: '1234567890',
      accountName: 'สมชาย ใจดี',
      isPrimary: true,
    },
  ],
};

/**
 * Withdraw limits and promo-lock state, mirroring `member/loadbalance` +
 * `member/profile`'s `amount_balance`/`withdraw_limit_amount` fields. Set
 * `USER.activePromotionName` alongside `promoTurnoverRequired` to exercise
 * the promo-forced-amount path in mock mode.
 */
export const WITHDRAW_INFO = {
  canWithdraw: true,
  notice: null as string | null,
  min: 10_000, // 100.00
  max: 20_000_000, // 200,000.00
  maxPerDay: 20_000_000, // 200,000.00
  promoTurnoverRequired: 0,
  promoWithdrawLimit: 0,
};

export const WALLET: Wallet = {
  balance: 1_284_550, // 12,845.50
  diamond: 1_240,
  cashback: 32_800, // 328.00
  monthlyTurnover: 4_560_000, // 45,600.00
  currency: 'THB',
  updatedAt: new Date().toISOString(),
};

/** Rounds are generated relative to "now" so countdowns always look alive. */
export function buildRounds(): LotteryRound[] {
  const now = Date.now();
  const min = 60_000;

  const yeekeeSlot = Math.ceil((now + 5 * min) / (15 * min)) * (15 * min);

  return [
    {
      id: 'gov-thai',
      name: 'หวยรัฐบาลไทย',
      category: 'government',
      status: 'open',
      closesAt: new Date(now + 3 * 24 * 60 * min).toISOString(),
      drawsAt: new Date(now + 3 * 24 * 60 * min + 120 * min).toISOString(),
      label: '16/09/2569',
      betTypes: ['3top', '3tod', '2top', '2bottom', 'run_top', 'run_bottom'],
    },
    {
      id: 'yeekee-vip',
      name: 'ยี่กี VIP',
      category: 'yeekee',
      status: 'open',
      closesAt: new Date(yeekeeSlot).toISOString(),
      drawsAt: new Date(yeekeeSlot + 2 * min).toISOString(),
      label: `รอบที่ ${Math.floor((yeekeeSlot % 86_400_000) / (15 * min)) + 1}`,
      betTypes: ['3top', '3tod', '2top', '2bottom', 'run_top', 'run_bottom'],
    },
    {
      id: 'hanoi-special',
      name: 'ฮานอย พิเศษ',
      category: 'hanoi',
      status: 'open',
      closesAt: new Date(now + 190 * min).toISOString(),
      drawsAt: new Date(now + 210 * min).toISOString(),
      label: 'ประจำวันนี้',
      betTypes: ['3top', '3tod', '2top', '2bottom', 'run_top', 'run_bottom'],
    },
    {
      id: 'laos-hd',
      name: 'ลาว HD',
      category: 'laos',
      status: 'open',
      closesAt: new Date(now + 320 * min).toISOString(),
      drawsAt: new Date(now + 350 * min).toISOString(),
      label: 'ประจำวันนี้',
      betTypes: ['3top', '3tod', '2top', '2bottom'],
    },
    {
      id: 'nikkei-vip',
      name: 'หุ้นนิเคอิ (เช้า)',
      category: 'stock',
      status: 'closing',
      closesAt: new Date(now + 12 * min).toISOString(),
      drawsAt: new Date(now + 30 * min).toISOString(),
      label: 'รอบเช้า',
      betTypes: ['3top', '3tod', '2top', '2bottom'],
    },
    {
      id: 'dow-jones',
      name: 'หุ้นดาวโจนส์',
      category: 'stock',
      status: 'closed',
      closesAt: new Date(now - 45 * min).toISOString(),
      drawsAt: new Date(now + 60 * min).toISOString(),
      label: 'รอบล่าสุด',
      betTypes: ['3top', '2top', '2bottom'],
    },
  ];
}

const DEFAULT_BET_TYPES: RoundRates['betTypes'] = [
  { id: '3top', digits: 3, payout: 900, minStake: 100, maxStake: 200_000 },
  { id: '3tod', digits: 3, payout: 150, minStake: 100, maxStake: 200_000 },
  { id: '2top', digits: 2, payout: 95, minStake: 100, maxStake: 500_000 },
  { id: '2bottom', digits: 2, payout: 95, minStake: 100, maxStake: 500_000 },
  { id: 'run_top', digits: 1, payout: 3.2, minStake: 100, maxStake: 500_000 },
  { id: 'run_bottom', digits: 1, payout: 4.2, minStake: 100, maxStake: 500_000 },
];

export function buildRates(roundId: string): RoundRates {
  return {
    roundId,
    betTypes: DEFAULT_BET_TYPES,
    // เลขอั้น: จำกัดยอด / ปิดรับ
    restricted: [
      { betType: '2top', number: '19', closed: false, maxAmount: 50_000 },
      { betType: '2top', number: '28', closed: false, maxAmount: 50_000 },
      { betType: '2top', number: '69', closed: true, maxAmount: null },
      { betType: '2bottom', number: '07', closed: false, maxAmount: 60_000 },
      { betType: '3top', number: '123', closed: true, maxAmount: null },
      { betType: '3top', number: '456', closed: false, maxAmount: 45_000 },
    ],
  };
}

export const DEPOSIT_ACCOUNTS: Record<'bank' | 'tw' | 'slip', DepositChannel[]> = {
  bank: [
    {
      id: 'dc_1',
      bankName: 'ธนาคารกสิกรไทย',
      accountNumber: '0451234567',
      accountName: 'บจก. ลอตเตอรี่ แล็บส์',
      qrImageUrl: 'https://placehold.co/240x240?text=QR',
      minAmount: 10_000,
    },
  ],
  tw: [
    {
      id: 'dc_2',
      bankName: 'TrueMoney Wallet',
      accountNumber: '0812345678',
      accountName: 'บจก. ลอตเตอรี่ แล็บส์',
      minAmount: 10_000,
    },
  ],
  slip: [
    {
      id: 'dc_3',
      bankName: 'ธนาคารกสิกรไทย',
      accountNumber: '0451234567',
      accountName: 'บจก. ลอตเตอรี่ แล็บส์',
      minAmount: 10_000,
    },
  ],
};

export const DEPOSIT_PAYMENT_PROVIDERS: DepositPaymentProvider[] = [
  { id: 'wealthpay', name: 'Wealthpay', minAmount: 10_000 },
  { id: 'flashpay', name: 'Flashpay', minAmount: 10_000 },
];

export const PROMOTIONS: Promotion[] = [
  {
    id: 'promo_welcome',
    title: 'โบนัสต้อนรับสมาชิกใหม่ 100%',
    description:
      'ฝากครั้งแรกรับโบนัสทันที 100% สูงสุด 1,000 บาท ใช้ได้กับทุกประเภทหวย',
    badge: '100%',
    minDeposit: 10_000,
    bonusPercent: 100,
    turnoverMultiplier: 3,
    startsAt: null,
    endsAt: null,
    claimed: false,
    claimable: true,
    hideClaimButton: false,
    terms: [
      'สำหรับสมาชิกใหม่ที่ยังไม่เคยรับโปรโมชั่นนี้',
      'ต้องทำยอดเดิมพันครบ 3 เท่าก่อนถอน',
      'รับได้ 1 ครั้งต่อ 1 บัญชี',
    ],
  },
  {
    id: 'promo_daily',
    title: 'ฝากประจำวัน รับเพิ่ม 10%',
    description: 'ฝากขั้นต่ำ 300 บาท รับโบนัสเพิ่ม 10% สูงสุด 500 บาทต่อวัน',
    badge: '10%',
    minDeposit: 30_000,
    bonusPercent: 10,
    turnoverMultiplier: 2,
    startsAt: null,
    endsAt: null,
    claimed: false,
    claimable: true,
    hideClaimButton: false,
    terms: ['รับได้วันละ 1 ครั้ง', 'ต้องทำยอดเดิมพันครบ 2 เท่าก่อนถอน'],
  },
  {
    id: 'promo_cashback',
    title: 'คืนยอดเสียรายสัปดาห์ 5%',
    description: 'คืนยอดเสียสะสมทุกวันจันทร์ ไม่มีขั้นต่ำ ถอนได้ทันที',
    badge: '5%',
    minDeposit: 0,
    bonusPercent: 5,
    turnoverMultiplier: 1,
    startsAt: null,
    endsAt: null,
    claimed: true,
    claimable: false,
    hideClaimButton: false,
    terms: ['คำนวณจากยอดเสียสุทธิของสัปดาห์ก่อนหน้า', 'เครดิตเข้าบัญชีอัตโนมัติ'],
  },
  {
    id: 'promo_referral',
    title: 'แนะนำเพื่อน รับค่าคอม 1%',
    description: 'รับค่าคอมมิชชั่นจากยอดเล่นของเพื่อนตลอดชีพ ไม่จำกัดจำนวน',
    badge: '1%',
    minDeposit: 0,
    bonusPercent: 1,
    turnoverMultiplier: 1,
    startsAt: null,
    endsAt: null,
    claimed: false,
    claimable: true,
    hideClaimButton: false,
    terms: ['คำนวณจากยอดเดิมพันของเพื่อนที่แนะนำ', 'จ่ายทุกวันเวลา 06:00 น.'],
  },
];

/**
 * Raw, backend-shaped rows mirroring `GET member/contributor`'s `referrals[]`
 * — the mock intercepts below the client-side normalizer, same as `TRANSACTIONS`.
 */
export const REFERRAL_ROWS = [
  { id: 1, referee: { display_name: 'สมชาย ญาณกิจ', phone: '0891234567', created_at: '2026-08-01T04:00:00.000Z' }, total_earned: 124 },
  { id: 2, referee: { display_name: null, phone: '0851112222', created_at: '2026-07-24T09:30:00.000Z' }, total_earned: 86 },
  { id: 3, referee: { display_name: 'ณัฐพงษ์ ใจงาม', phone: '0871234567', created_at: '2026-07-11T12:05:00.000Z' }, total_earned: 312 },
  { id: 4, referee: { display_name: 'ธนกร สุขใจ', phone: '0861234567', created_at: '2026-06-28T17:45:00.000Z' }, total_earned: 41 },
];

export const CONTACT_CHANNELS: ContactChannel[] = [
  { code: 1, type: 'line', label: '@lotterylabs', link: 'https://line.me/R/ti/p/@lotterylabs', sort: 1 },
  { code: 2, type: 'telegram', label: '@lotterylabs_support', link: 'https://t.me/lotterylabs_support', sort: 2 },
  { code: 3, type: 'phone', label: '02-123-4567', link: 'tel:021234567', sort: 3 },
];

/** Raw, backend-shaped fixtures mirroring `games/types` / `games/providers/{type}`. */
export const GAME_TYPES = [
  { id: 'slot', name: 'สล็อต', status_open: 'Y' },
  { id: 'casino', name: 'คาสิโน', status_open: 'Y' },
  { id: 'sport', name: 'กีฬา', status_open: 'Y' },
  { id: 'card', name: 'ไพ่', status_open: 'Y' },
  { id: 'poker', name: 'โป๊กเกอร์', status_open: 'Y' },
  { id: 'keno', name: 'คีโน่', status_open: 'Y' },
  { id: 'cock', name: 'ไก่ชน', status_open: 'Y' },
];

export const GAME_PROVIDERS: Record<
  string,
  Array<{ provider: string; providerName: string; logoURL: string; status: string }>
> = {
  slot: [
    { provider: 'pgsoft', providerName: 'PG Soft', logoURL: 'https://placehold.co/200x320?text=PG+Soft', status: 'ACTIVE' },
    { provider: 'jili', providerName: 'JILI', logoURL: 'https://placehold.co/200x320?text=JILI', status: 'ACTIVE' },
    { provider: 'pragmatic', providerName: 'Pragmatic Play', logoURL: 'https://placehold.co/200x320?text=Pragmatic', status: 'ACTIVE' },
  ],
  casino: [
    { provider: 'sagaming', providerName: 'SA Gaming', logoURL: 'https://placehold.co/200x320?text=SA+Gaming', status: 'ACTIVE' },
    { provider: 'evolution', providerName: 'Evolution', logoURL: 'https://placehold.co/200x320?text=Evolution', status: 'ACTIVE' },
  ],
  sport: [
    { provider: 'saba', providerName: 'SABA Sports', logoURL: 'https://placehold.co/200x320?text=SABA', status: 'ACTIVE' },
  ],
  card: [
    { provider: 'sexybcrt', providerName: 'Sexy Baccarat', logoURL: 'https://placehold.co/200x320?text=Sexy+Bcrt', status: 'ACTIVE' },
  ],
  poker: [
    { provider: 'poker88', providerName: 'Poker88', logoURL: 'https://placehold.co/200x320?text=Poker88', status: 'ACTIVE' },
  ],
  keno: [
    { provider: 'kenostar', providerName: 'Keno Star', logoURL: 'https://placehold.co/200x320?text=Keno+Star', status: 'ACTIVE' },
  ],
  cock: [
    { provider: 'sabong', providerName: 'Sabong International', logoURL: 'https://placehold.co/200x320?text=Sabong', status: 'ACTIVE' },
  ],
};

export const PROVIDER_GAMES: Record<
  string,
  Array<{ id: string; provider: string; gameName: string; image: { vertical: string }; status: string }>
> = {
  pgsoft: [
    { id: 'g_ganesha', provider: 'pgsoft', gameName: 'Ganesha Fortune', image: { vertical: 'https://placehold.co/200x300?text=Ganesha' }, status: 'ACTIVE' },
    { id: 'g_dragon', provider: 'pgsoft', gameName: 'Dragon Tiger Luck', image: { vertical: 'https://placehold.co/200x300?text=Dragon+Tiger' }, status: 'ACTIVE' },
  ],
  jili: [
    { id: 'g_fortune', provider: 'jili', gameName: 'Fortune Gems', image: { vertical: 'https://placehold.co/200x300?text=Fortune+Gems' }, status: 'ACTIVE' },
  ],
  sagaming: [
    { id: 'g_baccarat', provider: 'sagaming', gameName: 'SA Baccarat', image: { vertical: 'https://placehold.co/200x300?text=Baccarat' }, status: 'ACTIVE' },
  ],
};

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { code: 1, prize: 5, label: '5 บาท', imageUrl: 'https://placehold.co/120x120?text=5', fillStyle: '#eb198d', name: 'เงินสด', types: 'cash' },
  { code: 2, prize: 10, label: '10 บาท', imageUrl: 'https://placehold.co/120x120?text=10', fillStyle: '#1ba5e1', name: 'เงินสด', types: 'cash' },
  { code: 3, prize: 0, label: 'เสียใจด้วย', imageUrl: 'https://placehold.co/120x120?text=X', fillStyle: '#6d6e71', name: 'ไม่ได้รางวัล', types: 'none' },
  { code: 4, prize: 20, label: '20 บาท', imageUrl: 'https://placehold.co/120x120?text=20', fillStyle: '#fec43b', name: 'เงินสด', types: 'cash' },
  { code: 5, prize: 3, label: '3 บาท', imageUrl: 'https://placehold.co/120x120?text=3', fillStyle: '#138f2d', name: 'เงินสด', types: 'cash' },
  { code: 6, prize: 100, label: '100 บาท', imageUrl: 'https://placehold.co/120x120?text=100', fillStyle: '#4e2e7f', name: 'แจ็คพอต', types: 'cash' },
  { code: 7, prize: 0, label: 'เสียใจด้วย', imageUrl: 'https://placehold.co/120x120?text=X', fillStyle: '#6d6e71', name: 'ไม่ได้รางวัล', types: 'none' },
  { code: 8, prize: 50, label: '50 บาท', imageUrl: 'https://placehold.co/120x120?text=50', fillStyle: '#1e4598', name: 'เงินสด', types: 'cash' },
];

export const WHEEL_ENABLED = true;

/** DD/MM/YYYY in the Buddhist era, matching the real `wheel/history` date format. */
function wheelDate(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear() + 543}`;
}

export const WHEEL_HISTORY: WheelHistoryGroup[] = [
  {
    date: wheelDate(0),
    items: [
      { credit: '+10 บาท', time: '14:22' },
      { credit: '+3 บาท', time: '09:05' },
    ],
  },
  {
    date: wheelDate(1),
    items: [
      { credit: '+100 บาท', time: '20:41' },
      { credit: 'ไม่ได้รางวัล', time: '11:12' },
    ],
  },
];

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const MOCK_BANK_REF = {
  bankCode: 'KBANK',
  bankName: 'ธนาคารกสิกรไทย',
  accountNumber: '1234567890',
};

export const TRANSACTIONS: Transaction[] = [
  {
    id: 't1', reference: 'DP26082401', type: 'deposit', direction: 'credit', status: 'success',
    title: 'ฝากเงิน', amount: 100_000, signedAmount: 100_000, balanceAfter: 1_284_550,
    bankAccount: MOCK_BANK_REF, createdAt: hoursAgo(3), completedAt: hoursAgo(3),
  },
  {
    id: 't2', reference: 'WD26082302', type: 'withdraw', direction: 'debit', status: 'processing',
    title: 'ถอนเงิน', amount: 50_000, signedAmount: -50_000, balanceAfter: 1_184_550,
    bankAccount: MOCK_BANK_REF, createdAt: hoursAgo(9), completedAt: null,
  },
  {
    id: 't3', reference: 'BN26082201', type: 'bonus', direction: 'credit', status: 'success',
    title: 'โบนัส', amount: 10_000, signedAmount: 10_000, balanceAfter: 1_234_550,
    note: 'โบนัสฝากประจำวัน 10%', createdAt: hoursAgo(26), completedAt: hoursAgo(26),
  },
  {
    id: 't4', reference: 'DP26082102', type: 'deposit', direction: 'credit', status: 'success',
    title: 'ฝากเงิน', amount: 300_000, signedAmount: 300_000, balanceAfter: 1_224_550,
    bankAccount: MOCK_BANK_REF, createdAt: hoursAgo(52), completedAt: hoursAgo(52),
  },
  {
    id: 't5', reference: 'WD26082001', type: 'withdraw', direction: 'debit', status: 'failed',
    title: 'ถอนเงิน', amount: 200_000, signedAmount: -200_000, balanceAfter: null,
    bankAccount: MOCK_BANK_REF, note: 'ชื่อบัญชีไม่ตรงกับข้อมูลสมาชิก',
    createdAt: hoursAgo(74), completedAt: hoursAgo(73),
  },
  {
    id: 't6', reference: 'CB26081901', type: 'cashback', direction: 'credit', status: 'success',
    title: 'เงินคืน', amount: 32_800, signedAmount: 32_800, balanceAfter: 924_550,
    note: 'คืนยอดเสียรายสัปดาห์ 5%', createdAt: hoursAgo(96), completedAt: hoursAgo(96),
  },
];

export function buildTickets(): MockTicket[] {
  return [
    {
      id: 'tk1',
      draw_id: 'yeekee-vip',
      market_name: 'ยี่กี VIP',
      status: 'pending',
      created_at: hoursAgo(1),
      item_count: 3,
      total_bet_amount: 150,
      total_win_amount: 0,
      is_final: false,
      is_winner: false,
      items: [
        { bet_type: 'top_2', number: '42', amount: 50, payout_at_time: 95, result_status: null, win_amount: 0 },
        { bet_type: 'bottom_2', number: '17', amount: 50, payout_at_time: 95, result_status: null, win_amount: 0 },
        { bet_type: 'top_3', number: '842', amount: 50, payout_at_time: 900, result_status: null, win_amount: 0 },
      ],
    },
    {
      id: 'tk2',
      draw_id: 'hanoi-special',
      market_name: 'ฮานอย พิเศษ',
      status: 'won',
      created_at: hoursAgo(20),
      item_count: 2,
      total_bet_amount: 100,
      total_win_amount: 475,
      is_final: true,
      is_winner: true,
      items: [
        { bet_type: 'top_2', number: '58', amount: 50, payout_at_time: 95, result_status: 'win', win_amount: 475 },
        { bet_type: 'bottom_2', number: '31', amount: 50, payout_at_time: 95, result_status: 'lose', win_amount: 0 },
      ],
    },
    {
      id: 'tk3',
      draw_id: 'laos-hd',
      market_name: 'ลาว HD',
      status: 'lost',
      created_at: hoursAgo(44),
      item_count: 2,
      total_bet_amount: 200,
      total_win_amount: 0,
      is_final: true,
      is_winner: false,
      items: [
        { bet_type: 'top_3', number: '119', amount: 100, payout_at_time: 900, result_status: 'lose', win_amount: 0 },
        { bet_type: 'tod_3', number: '119', amount: 100, payout_at_time: 150, result_status: 'lose', win_amount: 0 },
      ],
    },
  ];
}

