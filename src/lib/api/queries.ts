'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import type { BonusSource, DepositMethod, TransactionType } from '@/types';

import {
  accountApi,
  contactApi,
  depositApi,
  gamesApi,
  isExpiredStatus,
  isPaidLikeStatus,
  lotteryApi,
  promotionApi,
  referenceApi,
  referralApi,
  walletApi,
  wheelApi,
} from './endpoints';

/** One namespace for every cache key so invalidation stays predictable. */
export const qk = {
  banks: ['banks'] as const,
  me: ['me'] as const,
  wallet: ['wallet'] as const,
  bankAccounts: ['bank-accounts'] as const,
  withdrawInfo: ['withdraw-info'] as const,
  bonusSummary: ['bonus-summary'] as const,
  rounds: (category?: string) => ['lottery', 'rounds', category ?? 'all'] as const,
  groups: ['lottery', 'groups'] as const,
  round: (id: string) => ['lottery', 'round', id] as const,
  rates: (id: string) => ['lottery', 'rates', id] as const,
  packages: (groupId: number) => ['lottery', 'packages', groupId] as const,
  selectedPackage: (groupId: number) => ['lottery', 'selected-package', groupId] as const,
  results: ['lottery', 'results'] as const,
  tickets: () => ['lottery', 'tickets'] as const,
  ticketDetail: (id: string) => ['lottery', 'ticket', id] as const,
  transactions: (
    type: TransactionType | 'all',
    dateStart: string,
    dateStop: string,
    page: number,
  ) => ['wallet', 'transactions', type, dateStart, dateStop, page] as const,
  depositAccounts: (method: Exclude<DepositMethod, 'payment'>) =>
    ['deposit', 'accounts', method] as const,
  depositPaymentProviders: ['deposit', 'payment-providers'] as const,
  promotions: ['promotions'] as const,
  referral: ['referral'] as const,
  wheelList: ['wheel', 'list'] as const,
  wheelHistory: ['wheel', 'history'] as const,
  contactChannels: ['contact', 'channels'] as const,
  gameCategories: ['games', 'categories'] as const,
  gameProviders: (type: string) => ['games', 'providers', type] as const,
  providerGames: (type: string, providerId: string) =>
    ['games', 'provider-games', type, providerId] as const,
};

/* --------------------------------- queries ------------------------------- */

export const useBanks = () =>
  useQuery({
    queryKey: qk.banks,
    queryFn: referenceApi.banks,
    staleTime: 24 * 60 * 60 * 1000, // the bank list barely ever changes
  });

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: accountApi.me });

/**
 * The balance is the one thing that must never look stale — refetch whenever
 * the tab regains focus and on a slow background interval.
 */
export const useWallet = (options?: Partial<UseQueryOptions>) =>
  useQuery({
    queryKey: qk.wallet,
    queryFn: accountApi.wallet,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    ...(options as object),
  });

export const useBankAccounts = () =>
  useQuery({ queryKey: qk.bankAccounts, queryFn: accountApi.bankAccounts });

/** Withdraw limits, the daily running total, system notice, and promo lock state. */
export const useWithdrawInfo = () =>
  useQuery({
    queryKey: qk.withdrawInfo,
    queryFn: accountApi.withdrawInfo,
    staleTime: 10_000,
  });

export const useBonusSummary = () =>
  useQuery({
    queryKey: qk.bonusSummary,
    queryFn: accountApi.bonusSummary,
    staleTime: 10_000,
  });

export const useRounds = (category?: string) =>
  useQuery({
    queryKey: qk.rounds(category),
    queryFn: () => lotteryApi.rounds(category),
    // Countdowns are computed client-side; this just keeps statuses honest.
    refetchInterval: 60_000,
  });

export const useLotteryGroups = () =>
  useQuery({
    queryKey: qk.groups,
    queryFn: lotteryApi.groups,
    refetchInterval: 60_000,
  });

export const useRound = (id: string) =>
  useQuery({ queryKey: qk.round(id), queryFn: () => lotteryApi.round(id), enabled: !!id });

export const useRates = (id: string) =>
  useQuery({
    queryKey: qk.rates(id),
    queryFn: () => lotteryApi.rates(id),
    enabled: !!id,
    staleTime: 30_000,
  });

export const usePackages = (groupId?: number) =>
  useQuery({
    queryKey: qk.packages(groupId ?? 0),
    queryFn: () => lotteryApi.packages(groupId as number),
    enabled: !!groupId,
    staleTime: 5 * 60_000,
  });

export const useSelectedPackage = (groupId?: number) =>
  useQuery({
    queryKey: qk.selectedPackage(groupId ?? 0),
    queryFn: () => lotteryApi.selectedPackage(groupId as number),
    enabled: !!groupId,
  });

export function useSelectPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, packageId }: { groupId: number; packageId: number }) =>
      lotteryApi.selectPackage(groupId, packageId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: qk.selectedPackage(vars.groupId) });
    },
  });
}

export const useResultGroups = (enabled = true) =>
  useQuery({ queryKey: qk.results, queryFn: lotteryApi.resultGroups, enabled });

export const useResultsByDate = (drawDate: string | null) =>
  useQuery({
    queryKey: ['lottery', 'results', 'by-date', drawDate],
    queryFn: () => lotteryApi.resultsByDate(drawDate as string),
    enabled: !!drawDate,
  });

export const useTickets = () =>
  useQuery({
    queryKey: qk.tickets(),
    queryFn: lotteryApi.tickets,
  });

export const useTicketDetail = (id?: string) =>
  useQuery({
    queryKey: qk.ticketDetail(id ?? ''),
    queryFn: () => lotteryApi.ticketDetail(id as string),
    enabled: !!id,
  });

export const useDepositAccounts = (
  method: Exclude<DepositMethod, 'payment'>,
  enabled = true,
) =>
  useQuery({
    queryKey: qk.depositAccounts(method),
    queryFn: () => depositApi.accounts(method),
    enabled,
  });

export const useDepositPaymentProviders = (enabled = true) =>
  useQuery({
    queryKey: qk.depositPaymentProviders,
    queryFn: depositApi.paymentProviders,
    enabled,
  });

export const useTransactions = (filters: {
  type: TransactionType | 'all';
  dateStart?: string;
  dateStop?: string;
  page?: number;
}) =>
  useQuery({
    queryKey: qk.transactions(
      filters.type,
      filters.dateStart ?? '',
      filters.dateStop ?? '',
      filters.page ?? 1,
    ),
    queryFn: () =>
      walletApi.transactions({
        type: filters.type,
        dateStart: filters.dateStart,
        dateStop: filters.dateStop,
        page: filters.page,
      }),
  });

export const usePromotions = () =>
  useQuery({ queryKey: qk.promotions, queryFn: promotionApi.list });

/** One call to `member/contributor` carries both the summary stats and the referred-friends list. */
export const useReferral = () =>
  useQuery({ queryKey: qk.referral, queryFn: referralApi.contributor });

export const useWheelList = () =>
  useQuery({ queryKey: qk.wheelList, queryFn: wheelApi.list });

export const useWheelHistory = () =>
  useQuery({ queryKey: qk.wheelHistory, queryFn: wheelApi.history });

export const useContactChannels = () =>
  useQuery({
    queryKey: qk.contactChannels,
    queryFn: contactApi.channels,
    staleTime: 5 * 60_000, // support channels barely change
  });

export const useGameCategories = () =>
  useQuery({
    queryKey: qk.gameCategories,
    queryFn: gamesApi.categories,
    staleTime: 60_000,
  });

export const useGameProviders = (type: string) =>
  useQuery({
    queryKey: qk.gameProviders(type),
    queryFn: () => gamesApi.providersByType(type),
    staleTime: 60_000,
  });

export const useProviderGames = (type: string, providerId: string) =>
  useQuery({
    queryKey: qk.providerGames(type, providerId),
    queryFn: () => gamesApi.gamesByProvider(type, providerId),
  });

/* -------------------------------- mutations ------------------------------ */

/**
 * Anything that moves money invalidates the wallet and the ledger. We never
 * optimistically patch a balance — the server number is the only truth.
 */
function useMoneyMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.wallet });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: qk.withdrawInfo });
    },
  });
}

export const useWithdraw = () => useMoneyMutation(walletApi.withdraw);

export const useCreateDepositPayment = () =>
  useMutation({
    mutationFn: ({
      providerId,
      paymentUrl,
      amountMajor,
    }: {
      providerId: string;
      paymentUrl: string;
      amountMajor: number;
    }) => depositApi.createPayment(providerId, paymentUrl, amountMajor),
  });

export const useDepositPaymentStatus = (
  providerId: string | null,
  requestId: string | null,
) =>
  useQuery({
    queryKey: ['deposit', 'payment-status', providerId, requestId],
    queryFn: () => depositApi.paymentStatus(providerId as string, requestId as string),
    enabled: !!providerId && !!requestId,
    // Jittered like lotto-seed-app (10-20s) to avoid thundering-herd polling,
    // and stops once the payment has settled one way or the other.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && (isPaidLikeStatus(status) || isExpiredStatus(status))) return false;
      return 10_000 + Math.floor(Math.random() * 10_001);
    },
  });

export function useExpireDepositPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, requestId }: { providerId: string; requestId: string }) =>
      depositApi.expirePayment(providerId, requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.wallet }),
  });
}
export function useClaimBonus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (source: BonusSource) => walletApi.claim(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.wallet });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: qk.withdrawInfo });
      queryClient.invalidateQueries({ queryKey: qk.bonusSummary });
    },
  });
}

export function useCancelTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lotteryApi.cancelTicket(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: qk.tickets() });
      queryClient.invalidateQueries({ queryKey: qk.ticketDetail(id) });
      queryClient.invalidateQueries({ queryKey: qk.wallet });
    },
  });
}

export function useSubmitSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lotteryApi.submitSlip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.wallet });
      queryClient.invalidateQueries({ queryKey: ['lottery', 'tickets'] });
    },
  });
}

export function useClaimPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: promotionApi.claim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.promotions });
      queryClient.invalidateQueries({ queryKey: qk.me });
      queryClient.invalidateQueries({ queryKey: qk.wallet });
    },
  });
}

export function useDeselectPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: promotionApi.deselect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.promotions });
      queryClient.invalidateQueries({ queryKey: qk.me });
      queryClient.invalidateQueries({ queryKey: qk.wallet });
    },
  });
}

export function useSpinWheel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wheelApi.spin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.wallet });
      queryClient.invalidateQueries({ queryKey: qk.wheelHistory });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ password, confirm }: { password: string; confirm: string }) =>
      accountApi.changePassword(password, confirm),
  });
}

export function useLaunchGame() {
  return useMutation({
    mutationFn: ({ providerId, gameId }: { providerId: string; gameId: string }) =>
      gamesApi.login(providerId, gameId),
  });
}
