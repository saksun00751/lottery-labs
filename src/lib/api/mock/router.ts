import 'server-only';

import type { Transaction, Wallet, WheelHistoryGroup } from '@/types';

import {
  BANKS,
  DEPOSIT_ACCOUNTS,
  DEPOSIT_PAYMENT_PROVIDERS,
  PROMOTIONS,
  CONTACT_CHANNELS,
  GAME_PROVIDERS,
  GAME_TYPES,
  PROVIDER_GAMES,
  REFERRAL_ROWS,
  TRANSACTIONS,
  USER,
  WALLET,
  WHEEL_ENABLED,
  WHEEL_HISTORY,
  WHEEL_SEGMENTS,
  WITHDRAW_INFO,
  buildRates,
  buildRounds,
  buildTickets,
  type MockTicket,
} from './data';

/* =========================================================================
 *  Minimal in-memory API used when NEXT_PUBLIC_USE_MOCK=true.
 *
 *  State lives in module scope, so it survives between requests within one
 *  server process and resets on restart. Good enough to build and demo the
 *  whole UI before the real backend exists.
 * ========================================================================= */

interface MockState {
  wallet: Wallet;
  transactions: Transaction[];
  tickets: MockTicket[];
  claimedPromotions: Set<string>;
  /** Minor units withdrawn today — resets to 0 on server restart, same as `transactions`. */
  withdrawSumToday: number;
  /** Idempotency-Key -> response already produced for that key. */
  idempotency: Map<string, unknown>;
  wheelHistory: WheelHistoryGroup[];
}

const state: MockState = {
  wallet: { ...WALLET },
  transactions: [...TRANSACTIONS],
  tickets: buildTickets(),
  claimedPromotions: new Set(
    PROMOTIONS.filter((p) => p.claimed).map((p) => p.id),
  ),
  withdrawSumToday: 0,
  idempotency: new Map(),
  wheelHistory: WHEEL_HISTORY.map((g) => ({ ...g, items: [...g.items] })),
};

export interface MockRequest {
  method: string;
  /** Path with the /api/proxy prefix already stripped, e.g. "wallet". */
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  idempotencyKey: string | null;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

const ok = (body: unknown = { ok: true }): MockResponse => ({ status: 200, body });
const fail = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): MockResponse => ({ status, body: { code, message, fields } });

function ref(prefix: string) {
  return `${prefix}${Date.now().toString().slice(-8)}`;
}

function paginate<T>(items: T[], query: URLSearchParams) {
  const page = Math.max(1, Number(query.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') ?? 20)));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

export async function handleMock(req: MockRequest): Promise<MockResponse> {
  // Replaying a mutation with the same key returns the original result.
  if (req.idempotencyKey && state.idempotency.has(req.idempotencyKey)) {
    return ok(state.idempotency.get(req.idempotencyKey));
  }

  const response = await route(req);

  if (req.idempotencyKey && response.status < 400) {
    state.idempotency.set(req.idempotencyKey, response.body);
  }
  return response;
}

async function route({ method, path, query, body }: MockRequest): Promise<MockResponse> {
  const key = `${method} ${path}`;

  switch (true) {
    /* ------------------------------ reference ------------------------- */
    case key === 'GET banks':
    case key === 'GET auth/register/banks':
      return ok({ items: BANKS });

    /**
     * Mirrors the upstream account-name lookup used by the register form:
     * any 10+ digit number resolves to a fixed holder, anything shorter is
     * reported as not found so the "unknown account" path stays testable.
     */
    case key === 'POST auth/register/bank-account-name': {
      const accNo = String(body.acc_no ?? '').replace(/\D/g, '');
      if (accNo.length < 10) {
        return ok({
          success: false,
          message: 'ไม่พบชื่อบัญชี กรุณากรอกชื่อ-นามสกุลด้วยตนเอง',
          data: { valid: false },
        });
      }
      return ok({
        success: true,
        data: {
          valid: true,
          acc_no: accNo,
          account_name: `${USER.firstName} ${USER.lastName}`,
          firstname: USER.firstName,
          lastname: USER.lastName,
        },
      });
    }

    /* -------------------------------- account ------------------------- */
    case key === 'GET member/profile': {
      const primary = USER.bankAccounts[0];
      return ok({
        profile: {
          user_name: USER.username,
          tel: USER.phone,
          name: `${USER.firstName} ${USER.lastName}`,
          referral_code: USER.referralCode,
          created_at: USER.createdAt,
          bank_code: primary?.bankCode,
          bank_name: primary?.bankName,
          acc_no: primary?.accountNumber,
          acc_name: primary?.accountName,
          getpro: !!USER.activePromotionName,
          pro: !!USER.activePromotionName,
          pro_name: USER.activePromotionName ?? undefined,
          amount_balance: WITHDRAW_INFO.promoTurnoverRequired / 100,
          withdraw_limit_amount: WITHDRAW_INFO.promoWithdrawLimit / 100,
        },
      });
    }

    case key === 'GET member/balance':
      return ok({
        profile: {
          balance: state.wallet.balance / 100,
          diamond: state.wallet.diamond,
          cashback: state.wallet.cashback / 100,
          turnover: state.wallet.monthlyTurnover / 100,
        },
      });

    case key === 'GET member/loadbalance': {
      const primary = USER.bankAccounts[0];
      const remainToday = Math.max(0, WITHDRAW_INFO.maxPerDay - state.withdrawSumToday);
      return ok({
        success: true,
        withdraw: WITHDRAW_INFO.canWithdraw,
        system: { notice: WITHDRAW_INFO.notice },
        profile: {
          name: `${USER.firstName} ${USER.lastName}`,
          bank_code: primary?.bankCode,
          acc_no: primary?.accountNumber,
          balance: state.wallet.balance / 100,
          withdraw_min: WITHDRAW_INFO.min / 100,
          withdraw_max: WITHDRAW_INFO.max / 100,
          maxwithdraw_day: WITHDRAW_INFO.maxPerDay / 100,
          withdraw_sum_today: state.withdrawSumToday / 100,
          withdraw_remain_today: remainToday / 100,
          withdraw_limit_amount: WITHDRAW_INFO.promoWithdrawLimit / 100,
        },
      });
    }

    case key === 'POST member/change-password': {
      const password = String(body.password ?? '');
      const confirmation = String(body.password_confirmation ?? '');
      if (password.length < 6) {
        return fail(422, 'password_weak', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', {
          password: 'password_weak',
        });
      }
      if (password !== confirmation) {
        return fail(422, 'password_mismatch', 'รหัสผ่านไม่ตรงกัน', {
          password_confirmation: 'password_mismatch',
        });
      }
      return ok({ ok: true });
    }

    /* ------------------------------- lottery -------------------------- */
    case key === 'GET lottery/rounds': {
      const category = query.get('category');
      const rounds = buildRounds();
      return ok({
        items: category ? rounds.filter((r) => r.category === category) : rounds,
      });
    }

    case method === 'GET' && /^lottery\/rounds\/[^/]+$/.test(path): {
      const id = path.split('/')[2];
      const round = buildRounds().find((r) => r.id === id);
      return round ? ok(round) : fail(404, 'not_found', 'ไม่พบงวดหวยนี้');
    }

    case method === 'GET' && /^lottery\/rounds\/[^/]+\/rates$/.test(path):
      return ok(buildRates(path.split('/')[2]));

    case key === 'GET lotto/tickets':
      return ok({ data: state.tickets });

    case method === 'GET' && /^lotto\/tickets\/[^/]+$/.test(path): {
      const ticket = state.tickets.find((t) => t.id === path.split('/')[2]);
      return ticket ? ok({ data: ticket }) : fail(404, 'not_found', 'ไม่พบโพยนี้');
    }

    case key === 'POST lotto/bet': {
      const items = (body.items ?? []) as Array<{
        bet_type: string;
        number: string;
        amount: number;
      }>;
      if (!Array.isArray(items) || items.length === 0) {
        return fail(422, 'empty_slip', 'กรุณาเลือกเลขอย่างน้อย 1 รายการ');
      }
      const totalAmount = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
      if (totalAmount * 100 > state.wallet.balance) {
        return fail(422, 'insufficient_balance', 'ยอดเงินคงเหลือไม่เพียงพอ');
      }

      const rounds = buildRounds();
      const round = rounds.find((r) => r.drawId === body.draw_id || r.id === String(body.draw_id));
      if (!round) return fail(404, 'not_found', 'ไม่พบงวดหวยนี้');
      if (round.status === 'closed' || round.status === 'settled') {
        return fail(409, 'round_closed', 'งวดนี้ปิดรับแทงแล้ว');
      }

      const id = `tk_${Date.now()}`;
      const ticket: MockTicket = {
        id,
        draw_id: round.id,
        market_name: round.name,
        status: 'pending',
        created_at: new Date().toISOString(),
        item_count: items.length,
        total_bet_amount: totalAmount,
        total_win_amount: 0,
        is_final: false,
        is_winner: false,
        items: items.map((i) => ({
          bet_type: i.bet_type,
          number: i.number,
          amount: i.amount,
          payout_at_time: 0,
          result_status: null,
          win_amount: 0,
        })),
      };

      state.tickets = [ticket, ...state.tickets];
      state.wallet = { ...state.wallet, balance: state.wallet.balance - totalAmount * 100 };
      return ok({ data: { id, created_at: ticket.created_at } });
    }

    /* -------------------------------- wallet -------------------------- */
    case key === 'POST deposit/loadbank': {
      const depositMethod = String(body.method ?? 'bank');
      if (depositMethod === 'payment') {
        return ok({
          success: true,
          bank: Object.fromEntries(
            DEPOSIT_PAYMENT_PROVIDERS.map((p) => [
              p.id,
              { id: p.id, name: p.name, min_deposit: String(p.minAmount / 100) },
            ]),
          ),
        });
      }
      const accounts = DEPOSIT_ACCOUNTS[depositMethod as 'bank' | 'tw' | 'slip'] ?? [];
      return ok({
        success: true,
        bank: accounts.map((a) => ({
          acc_no: a.accountNumber,
          acc_name: a.accountName,
          bank_name: a.bankName,
          bank_pic: a.bankLogoUrl,
          qr_pic: a.qrImageUrl,
          qrcode: !!a.qrImageUrl,
          code: a.id,
          deposit_min: String(a.minAmount / 100),
        })),
      });
    }

    case key === 'GET wallet/transactions': {
      const type = query.get('type');
      const dateStart = query.get('date_start');
      const dateStop = query.get('date_stop');
      const list = state.transactions.filter((t) => {
        if (type && type !== 'all' && t.type !== type) return false;
        const day = t.createdAt.slice(0, 10);
        if (dateStart && day < dateStart) return false;
        if (dateStop && day > dateStop) return false;
        return true;
      });
      const { items, page, pageSize, total } = paginate(list, query);
      const totalCredit = list
        .filter((t) => t.direction === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalDebit = list
        .filter((t) => t.direction === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      return ok({
        success: true,
        data: {
          items: items.map((t) => ({
            id: t.id,
            created_at: t.createdAt,
            type: t.type,
            type_label: t.title,
            direction: t.direction.toUpperCase(),
            amount: t.amount / 100,
            signed_amount: t.signedAmount / 100,
            balance_after: t.balanceAfter === null ? undefined : t.balanceAfter / 100,
            status: t.status.toUpperCase(),
            title: t.title,
            detail: t.note ?? '',
          })),
          summary: {
            count: list.length,
            total_credit_amount: totalCredit / 100,
            total_debit_amount: totalDebit / 100,
            net_amount: (totalCredit - totalDebit) / 100,
          },
          pagination: {
            page,
            limit: pageSize,
            total,
            has_more: page * pageSize < total,
          },
        },
      });
    }

    case key === 'POST wallet/withdraw': {
      if (!WITHDRAW_INFO.canWithdraw) {
        return fail(422, 'withdraw_closed', 'ระบบถอนเงินปิดปรับปรุงชั่วคราว');
      }
      // The real endpoint takes the amount as a baht string, not minor units.
      const amount = Math.round(Number(body.amount ?? 0) * 100);
      if (amount < WITHDRAW_INFO.min) {
        return fail(422, 'amount_too_low', 'ยอดถอนขั้นต่ำ 100 บาท', {
          amount: 'amount_too_low',
        });
      }
      if (amount > state.wallet.balance) {
        return fail(422, 'insufficient_balance', 'ยอดเงินคงเหลือไม่เพียงพอ', {
          amount: 'insufficient_balance',
        });
      }
      if (state.withdrawSumToday + amount > WITHDRAW_INFO.maxPerDay) {
        return fail(422, 'daily_limit_exceeded', 'เกินวงเงินถอนต่อวัน', {
          amount: 'daily_limit_exceeded',
        });
      }
      state.withdrawSumToday += amount;
      state.wallet = { ...state.wallet, balance: state.wallet.balance - amount };
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: ref('WD'),
        type: 'withdraw',
        direction: 'debit',
        status: 'processing',
        title: 'ถอนเงิน',
        amount,
        signedAmount: -amount,
        balanceAfter: state.wallet.balance,
        bankAccount: {
          bankCode: USER.bankAccounts[0].bankCode,
          bankName: USER.bankAccounts[0].bankName,
          accountNumber: USER.bankAccounts[0].accountNumber,
        },
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      state.transactions = [tx, ...state.transactions];
      return ok(tx);
    }

    case key === 'POST wallet/cashback/claim': {
      const amount = state.wallet.cashback;
      if (amount <= 0) return fail(422, 'nothing_to_claim', 'ไม่มียอดคืนให้รับ');
      state.wallet = {
        ...state.wallet,
        balance: state.wallet.balance + amount,
        cashback: 0,
      };
      return ok({ claimed: amount, balance: state.wallet.balance });
    }

    /* ------------------------------ promotions ------------------------ */
    case key === 'GET promotions':
      return ok({
        items: PROMOTIONS.map((p) => ({
          ...p,
          claimed: state.claimedPromotions.has(p.id),
          claimable: !state.claimedPromotions.has(p.id),
        })),
      });

    case method === 'POST' && /^promotions\/[^/]+\/claim$/.test(path): {
      const id = path.split('/')[1];
      if (state.claimedPromotions.has(id)) {
        return fail(409, 'already_claimed', 'คุณรับโปรโมชั่นนี้ไปแล้ว');
      }
      state.claimedPromotions.add(id);
      return ok({ ok: true });
    }

    /* ---------------------------- lucky wheel -------------------------- */
    case key === 'GET wheel/list':
      return ok({
        success: true,
        data: {
          enabled: WHEEL_ENABLED,
          wheel: WHEEL_SEGMENTS.map((s) => ({
            code: s.code,
            fillStyle: s.fillStyle,
            image: s.imageUrl,
            text: s.label,
            amount: String(s.prize),
            name: s.name,
            types: s.types,
          })),
        },
      });

    case key === 'POST wheel/spin': {
      if (!WHEEL_ENABLED) return fail(422, 'wheel_disabled', 'กงล้อปิดใช้งานชั่วคราว');
      if (state.wallet.diamond < 1) {
        return fail(422, 'no_diamond', 'เพชรไม่เพียงพอสำหรับหมุนกงล้อ');
      }

      const index = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
      const segment = WHEEL_SEGMENTS[index];
      const segmentAngle = 360 / WHEEL_SEGMENTS.length;
      const point = index * segmentAngle + segmentAngle / 2;

      state.wallet = {
        ...state.wallet,
        diamond: state.wallet.diamond - 1,
        balance: state.wallet.balance + segment.prize * 100,
      };

      const title = segment.prize > 0 ? 'ยินดีด้วย!' : 'เสียใจด้วย';
      const msg =
        segment.prize > 0 ? `คุณได้รับรางวัล ${segment.prize} บาท` : 'ลองใหม่อีกครั้งนะ';
      const credit = segment.prize > 0 ? `+${segment.prize} บาท` : 'ไม่ได้รางวัล';
      const today = state.wheelHistory[0];
      const time = new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (today) today.items.unshift({ credit, time });
      else state.wheelHistory.unshift({ date: '', items: [{ credit, time }] });

      return ok({
        success: true,
        diamond: state.wallet.diamond,
        format: { title, msg, img: segment.imageUrl, point, diamond: state.wallet.diamond },
      });
    }

    case key === 'GET wheel/history':
      return ok({ success: true, data: { history: state.wheelHistory } });

    /* ------------------------------- referral ------------------------- */
    case key === 'GET member/contributor': {
      const totalEarned = REFERRAL_ROWS.reduce((sum, r) => sum + r.total_earned, 0);
      return ok({
        success: true,
        more_message: 'รับค่าคอมมิชชั่น 1% จากยอดเล่นของเพื่อนที่แนะนำ ตลอดชีพ',
        summary: {
          referred_members: REFERRAL_ROWS.length,
          referral_code: USER.referralCode,
          referral_income: totalEarned,
          promotion_bonus_income: 0,
          promotion_bonus_count: 0,
        },
        rule: { bonus_percent: 1, bonus_price: 0, display_value: null, more_message: null },
        referrals: REFERRAL_ROWS,
      });
    }

    /* -------------------------------- contact --------------------------- */
    case key === 'GET meta/contact-channels':
      return ok({ success: true, data: { contact_channels: CONTACT_CHANNELS } });

    /* --------------------------------- games ----------------------------- */
    case key === 'GET games/types':
      return ok({ success: true, data: GAME_TYPES });

    case method === 'GET' && /^games\/providers\/[^/]+$/.test(path): {
      const typeId = path.split('/')[2];
      return ok({ success: true, data: GAME_PROVIDERS[typeId] ?? [] });
    }

    case method === 'GET' && /^games\/[^/]+\/[^/]+$/.test(path): {
      const providerId = path.split('/')[2];
      return ok({ success: true, data: PROVIDER_GAMES[providerId] ?? [] });
    }

    case key === 'POST games/login': {
      const providerId = String(body.id ?? '');
      const gameId = String(body.game ?? '');
      return ok({
        success: true,
        data: { url: `https://placehold.co/game-launch?provider=${providerId}&game=${gameId}` },
      });
    }

    default:
      return fail(404, 'not_found', `Mock route not implemented: ${key}`);
  }
}

/** Credentials accepted by the mock auth routes. */
export const MOCK_CREDENTIALS = {
  identifier: ['demo_player', '0812345678'],
  password: 'password123',
};

export function mockLogin(identifier: string, password: string) {
  const matches =
    MOCK_CREDENTIALS.identifier.includes(identifier.trim()) &&
    password === MOCK_CREDENTIALS.password;

  if (!matches) return null;
  return { accessToken: `mock.${Buffer.from(identifier).toString('base64url')}`, user: USER };
}
