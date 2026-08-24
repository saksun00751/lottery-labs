import type {
  Bank,
  BankAccount,
  DepositChannel,
  DrawResult,
  LotteryRound,
  Paginated,
  Promotion,
  ReferralFriend,
  ReferralSummary,
  RoundRates,
  Ticket,
  Transaction,
  TransactionType,
  User,
  Wallet,
} from '@/types';

import { apiFetch, newIdempotencyKey } from './client';

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
  banks: () => apiFetch<List<Bank>>('banks').then((r) => r.items),
};

/* --------------------------------- account ------------------------------- */

export const accountApi = {
  me: () => apiFetch<User>('me'),
  wallet: () => apiFetch<Wallet>('wallet'),
  bankAccounts: () =>
    apiFetch<List<BankAccount>>('me/bank-accounts').then((r) => r.items),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<void>('me/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

/* --------------------------------- lottery ------------------------------- */

export const lotteryApi = {
  rounds: (category?: string) =>
    apiFetch<List<LotteryRound>>('lottery/rounds', {
      query: { category },
    }).then((r) => r.items),

  round: (id: string) => apiFetch<LotteryRound>(`lottery/rounds/${id}`),

  rates: (id: string) => apiFetch<RoundRates>(`lottery/rounds/${id}/rates`),

  results: () => apiFetch<List<DrawResult>>('lottery/results').then((r) => r.items),

  tickets: (params: { status?: string; page?: number } = {}) =>
    apiFetch<Paginated<Ticket>>('lottery/tickets', { query: params }),

  ticket: (id: string) => apiFetch<Ticket>(`lottery/tickets/${id}`),

  submitSlip: (payload: {
    roundId: string;
    items: Array<{ betType: string; number: string; stake: number; payout: number }>;
  }) =>
    apiFetch<Ticket>('lottery/tickets', {
      method: 'POST',
      body: payload,
      idempotencyKey: newIdempotencyKey(),
    }),
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

  claimCashback: () =>
    apiFetch<{ claimed: number; balance: number }>('wallet/cashback/claim', {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    }),
};

/* -------------------------------- promotions ----------------------------- */

export const promotionApi = {
  list: () => apiFetch<List<Promotion>>('promotions').then((r) => r.items),
  claim: (id: string) =>
    apiFetch<void>(`promotions/${id}/claim`, {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    }),
};

/* --------------------------------- referral ------------------------------ */

export const referralApi = {
  summary: () => apiFetch<ReferralSummary>('referral'),
  friends: (page = 1) =>
    apiFetch<Paginated<ReferralFriend>>('referral/friends', { query: { page } }),
};
