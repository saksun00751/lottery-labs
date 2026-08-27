import type {
  Bank,
  DepositChannel,
  DrawResult,
  LotteryRound,
  Promotion,
  ReferralFriend,
  ReferralSummary,
  RoundRates,
  Transaction,
  User,
  Wallet,
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

export const DEPOSIT_CHANNELS: DepositChannel[] = [
  {
    id: 'dc_1',
    type: 'bank_transfer',
    bankName: 'ธนาคารกสิกรไทย',
    accountNumber: '0451234567',
    accountName: 'บจก. ลอตเตอรี่ แล็บส์',
    minAmount: 10_000,
    maxAmount: 50_000_000,
  },
  {
    id: 'dc_2',
    type: 'qr_promptpay',
    bankName: 'พร้อมเพย์',
    accountNumber: '0812345678',
    accountName: 'บจก. ลอตเตอรี่ แล็บส์',
    qrPayload: '00020101021129370016A000000677010111...',
    minAmount: 10_000,
    maxAmount: 20_000_000,
  },
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
    terms: ['คำนวณจากยอดเดิมพันของเพื่อนที่แนะนำ', 'จ่ายทุกวันเวลา 06:00 น.'],
  },
];

export const REFERRAL: ReferralSummary = {
  code: USER.referralCode,
  link: `https://lotterylabs.example/r/${USER.referralCode}`,
  totalFriends: 14,
  activeFriends: 9,
  totalCommission: 187_450,
  pendingCommission: 12_300,
  commissionPercent: 1,
};

export const REFERRAL_FRIENDS: ReferralFriend[] = [
  { id: 'f1', maskedName: 'สม***ญ', joinedAt: '2026-08-01T04:00:00.000Z', turnover: 1_240_000, commission: 12_400 },
  { id: 'f2', maskedName: 'วิ***ร', joinedAt: '2026-07-24T09:30:00.000Z', turnover: 860_000, commission: 8_600 },
  { id: 'f3', maskedName: 'ณั***า', joinedAt: '2026-07-11T12:05:00.000Z', turnover: 3_120_000, commission: 31_200 },
  { id: 'f4', maskedName: 'ธน***ก', joinedAt: '2026-06-28T17:45:00.000Z', turnover: 410_000, commission: 4_100 },
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
    id: 't1', reference: 'DP26082401', type: 'deposit', status: 'success',
    amount: 100_000, balanceAfter: 1_284_550, bankAccount: MOCK_BANK_REF,
    createdAt: hoursAgo(3), completedAt: hoursAgo(3),
  },
  {
    id: 't2', reference: 'WD26082302', type: 'withdraw', status: 'processing',
    amount: 50_000, balanceAfter: 1_184_550, bankAccount: MOCK_BANK_REF,
    createdAt: hoursAgo(9), completedAt: null,
  },
  {
    id: 't3', reference: 'BN26082201', type: 'bonus', status: 'success',
    amount: 10_000, balanceAfter: 1_234_550, note: 'โบนัสฝากประจำวัน 10%',
    createdAt: hoursAgo(26), completedAt: hoursAgo(26),
  },
  {
    id: 't4', reference: 'DP26082102', type: 'deposit', status: 'success',
    amount: 300_000, balanceAfter: 1_224_550, bankAccount: MOCK_BANK_REF,
    createdAt: hoursAgo(52), completedAt: hoursAgo(52),
  },
  {
    id: 't5', reference: 'WD26082001', type: 'withdraw', status: 'failed',
    amount: 200_000, balanceAfter: null, bankAccount: MOCK_BANK_REF,
    note: 'ชื่อบัญชีไม่ตรงกับข้อมูลสมาชิก',
    createdAt: hoursAgo(74), completedAt: hoursAgo(73),
  },
  {
    id: 't6', reference: 'CB26081901', type: 'cashback', status: 'success',
    amount: 32_800, balanceAfter: 924_550, note: 'คืนยอดเสียรายสัปดาห์ 5%',
    createdAt: hoursAgo(96), completedAt: hoursAgo(96),
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

export function buildResults(): DrawResult[] {
  return [
    {
      roundId: 'hanoi-special',
      roundName: 'ฮานอย พิเศษ',
      roundLabel: 'ประจำวันที่ 23/08/2569',
      drawnAt: hoursAgo(18),
      numbers: { '3top': '758', '2top': '58', '2bottom': '46' },
    },
    {
      roundId: 'laos-hd',
      roundName: 'ลาว HD',
      roundLabel: 'ประจำวันที่ 22/08/2569',
      drawnAt: hoursAgo(42),
      numbers: { '3top': '204', '2top': '04', '2bottom': '77' },
    },
    {
      roundId: 'gov-thai',
      roundName: 'หวยรัฐบาลไทย',
      roundLabel: 'งวดวันที่ 16/08/2569',
      drawnAt: hoursAgo(190),
      numbers: { '3top': '619', '2bottom': '84' },
    },
    {
      roundId: 'nikkei-vip',
      roundName: 'หุ้นนิเคอิ (เช้า)',
      roundLabel: 'รอบเช้า 23/08/2569',
      drawnAt: hoursAgo(24),
      numbers: { '3top': '390', '2top': '90', '2bottom': '12' },
    },
  ];
}
