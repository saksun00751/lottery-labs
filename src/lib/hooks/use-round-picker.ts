'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { lotteryApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/api/queries';
import type { LotteryRound } from '@/types';

/**
 * Shared by every round-card grid (lottery list, today's lottery, ...).
 * Mirrors lotto-seed-app's bet page: a group only needs its package picked
 * once, so this re-checks the (cached) selection before deciding whether to
 * prompt again or go straight into the round.
 */
export function useRoundPicker() {
  const [pickerRound, setPickerRound] = useState<LotteryRound | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const play = async (round: LotteryRound) => {
    if (!round.groupId) {
      setPickerRound(round);
      return;
    }
    setCheckingId(round.id);
    try {
      const pkg = await queryClient.fetchQuery({
        queryKey: qk.selectedPackage(round.groupId),
        queryFn: () => lotteryApi.selectedPackage(round.groupId as number),
      });
      if (pkg) {
        router.push(`/lottery/${round.id}`);
      } else {
        setPickerRound(round);
      }
    } finally {
      setCheckingId(null);
    }
  };

  return {
    play,
    checkingId,
    pickerRound,
    closePicker: () => setPickerRound(null),
  };
}
