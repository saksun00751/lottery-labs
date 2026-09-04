'use client';

import { useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import type { LotteryRound } from '@/types';

/**
 * Shared by every round-card grid (lottery list, today's lottery, ...).
 * Always prompts the package picker on play, even if a package was already
 * selected for the group in a previous visit — except for a yeekee market,
 * which has many rounds per day and needs the rounds board first, not a
 * single package gate straight into a bet page.
 */
export function useRoundPicker() {
  const router = useRouter();
  const [pickerRound, setPickerRound] = useState<LotteryRound | null>(null);

  const play = (round: LotteryRound) => {
    if (round.category === 'yeekee') {
      router.push(`/lottery/yeekee/${round.id}`);
      return;
    }
    setPickerRound(round);
  };

  return {
    play,
    checkingId: null as string | null,
    pickerRound,
    closePicker: () => setPickerRound(null),
  };
}
