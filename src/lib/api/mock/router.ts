import 'server-only';

import type { Transaction, Wallet } from '@/types';

import {
  BANKS,
  DEPOSIT_CHANNELS,
  PROMOTIONS,
  REFERRAL,
  REFERRAL_FRIENDS,
  TRANSACTIONS,
  USER,
  WALLET,
  buildRates,
  buildResults,
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
  /** Idempotency-Key -> response already produced for that key. */
  idempotency: Map<string, unknown>;
}

const state: MockState = {
  wallet: { ...WALLET },
  transactions: [...TRANSACTIONS],
  tickets: buildTickets(),
  claimedPromotions: new Set(
    PROMOTIONS.filter((p) => p.claimed).map((p) => p.id),
  ),
  idempotency: new Map(),
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
    case key === 'GET me':
      return ok(USER);

    case key === 'GET wallet':
      return ok({ ...state.wallet, updatedAt: new Date().toISOString() });

    case key === 'GET me/bank-accounts':
      return ok({ items: USER.bankAccounts });

    case key === 'POST me/change-password': {
      const current = String(body.currentPassword ?? '');
      if (current !== 'password123') {
        return fail(422, 'invalid_password', 'รหัสผ่านปัจจุบันไม่ถูกต้อง', {
          currentPassword: 'invalid_password',
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

    case key === 'GET lottery/results':
      return ok({ items: buildResults() });

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
    case key === 'GET wallet/channels':
      return ok({ items: DEPOSIT_CHANNELS });

    case key === 'GET wallet/transactions': {
      const type = query.get('type');
      const list = type
        ? state.transactions.filter((t) => t.type === type)
        : state.transactions;
      return ok(paginate(list, query));
    }

    case key === 'POST wallet/deposits': {
      const amount = Number(body.amount ?? 0);
      if (amount < 10_000) {
        return fail(422, 'amount_too_low', 'ยอดฝากขั้นต่ำ 100 บาท', {
          amount: 'amount_too_low',
        });
      }
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: ref('DP'),
        type: 'deposit',
        status: 'pending',
        amount,
        balanceAfter: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      state.transactions = [tx, ...state.transactions];
      return ok(tx);
    }

    case key === 'POST wallet/withdrawals': {
      const amount = Number(body.amount ?? 0);
      if (amount < 10_000) {
        return fail(422, 'amount_too_low', 'ยอดถอนขั้นต่ำ 100 บาท', {
          amount: 'amount_too_low',
        });
      }
      if (amount > state.wallet.balance) {
        return fail(422, 'insufficient_balance', 'ยอดเงินคงเหลือไม่เพียงพอ', {
          amount: 'insufficient_balance',
        });
      }
      state.wallet = { ...state.wallet, balance: state.wallet.balance - amount };
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: ref('WD'),
        type: 'withdraw',
        status: 'processing',
        amount,
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

    /* ------------------------------- referral ------------------------- */
    case key === 'GET referral':
      return ok(REFERRAL);

    case key === 'GET referral/friends':
      return ok(paginate(REFERRAL_FRIENDS, query));

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
