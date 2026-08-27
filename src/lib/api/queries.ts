'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import type { TransactionType } from '@/types';

import {
  accountApi,
  lotteryApi,
  promotionApi,
  referenceApi,
  referralApi,
  walletApi,
} from './endpoints';

/** One namespace for every cache key so invalidation stays predictable. */
export const qk = {
  banks: ['banks'] as const,
  me: ['me'] as const,
  wallet: ['wallet'] as const,
  bankAccounts: ['bank-accounts'] as const,
  rounds: (category?: string) => ['lottery', 'rounds', category ?? 'all'] as const,
  groups: ['lottery', 'groups'] as const,
  round: (id: string) => ['lottery', 'round', id] as const,
  rates: (id: string) => ['lottery', 'rates', id] as const,
  packages: (groupId: number) => ['lottery', 'packages', groupId] as const,
  selectedPackage: (groupId: number) => ['lottery', 'selected-package', groupId] as const,
  results: ['lottery', 'results'] as const,
  tickets: () => ['lottery', 'tickets'] as const,
  ticketDetail: (id: string) => ['lottery', 'ticket', id] as const,
  channels: ['wallet', 'channels'] as const,
  transactions: (type?: TransactionType) =>
    ['wallet', 'transactions', type ?? 'all'] as const,
  promotions: ['promotions'] as const,
  referral: ['referral'] as const,
  referralFriends: ['referral', 'friends'] as const,
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

export const useResults = () =>
  useQuery({ queryKey: qk.results, queryFn: lotteryApi.results });

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

export const useDepositChannels = () =>
  useQuery({ queryKey: qk.channels, queryFn: walletApi.channels });

export const useTransactions = (type?: TransactionType) =>
  useQuery({
    queryKey: qk.transactions(type),
    queryFn: () => walletApi.transactions({ type }),
  });

export const usePromotions = () =>
  useQuery({ queryKey: qk.promotions, queryFn: promotionApi.list });

export const useReferral = () =>
  useQuery({ queryKey: qk.referral, queryFn: referralApi.summary });

export const useReferralFriends = () =>
  useQuery({ queryKey: qk.referralFriends, queryFn: () => referralApi.friends() });

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
    },
  });
}

export const useDeposit = () => useMoneyMutation(walletApi.deposit);
export const useWithdraw = () => useMoneyMutation(walletApi.withdraw);
export const useClaimCashback = () => useMoneyMutation(() => walletApi.claimCashback());

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
      queryClient.invalidateQueries({ queryKey: qk.wallet });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      accountApi.changePassword(current, next),
  });
}
