'use client';

import { useState } from 'react';

import type { LotteryRound } from '@/types';

/**
 * Shared by every round-card grid (lottery list, today's lottery, ...).
 * Always prompts the package picker on play, even if a package was already
 * selected for the group in a previous visit.
 */
export function useRoundPicker() {
  const [pickerRound, setPickerRound] = useState<LotteryRound | null>(null);

  const play = (round: LotteryRound) => {
    setPickerRound(round);
  };

  return {
    play,
    checkingId: null as string | null,
    pickerRound,
    closePicker: () => setPickerRound(null),
  };
}
