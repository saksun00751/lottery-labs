'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BetEntry, BetTypeId, Minor } from '@/types';

/**
 * โพยหวย — the slip the player builds before submitting.
 *
 * Kept client-side (and persisted, so a refresh mid-selection is not
 * punished) until the player confirms. Nothing here is trusted by the
 * backend: stake limits, restricted numbers and the balance are all
 * re-validated server-side on submit.
 */

interface BetSlipState {
  roundId: string | null;
  entries: BetEntry[];
  /** Stake applied to newly added numbers. */
  defaultStake: Minor;

  setRound: (roundId: string) => void;
  setDefaultStake: (stake: Minor) => void;
  /** Adds a number, or removes it if it is already on the slip. */
  toggle: (betType: BetTypeId, number: string, payout: number) => void;
  addMany: (betType: BetTypeId, numbers: string[], payout: number) => void;
  removeMany: (betType: BetTypeId, numbers: string[]) => void;
  remove: (key: string) => void;
  updateStake: (key: string, stake: Minor) => void;
  applyStakeToAll: (stake: Minor) => void;
  clear: () => void;

  has: (betType: BetTypeId, number: string) => boolean;
  totalStake: () => Minor;
  maxWin: () => Minor;
}

const entryKey = (betType: BetTypeId, number: string) => `${betType}:${number}`;

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set, get) => ({
      roundId: null,
      entries: [],
      defaultStake: 500, // 5.00 ฿

      setRound: (roundId) =>
        set((state) =>
          // Switching rounds always starts a fresh slip — rates differ.
          state.roundId === roundId ? state : { roundId, entries: [] },
        ),

      setDefaultStake: (defaultStake) => set({ defaultStake }),

      toggle: (betType, number, payout) => {
        const key = entryKey(betType, number);
        const exists = get().entries.some((e) => e.key === key);
        if (exists) {
          set((state) => ({ entries: state.entries.filter((e) => e.key !== key) }));
          return;
        }
        set((state) => ({
          entries: [
            ...state.entries,
            { key, betType, number, stake: state.defaultStake, payout },
          ],
        }));
      },

      addMany: (betType, numbers, payout) =>
        set((state) => {
          const existing = new Set(state.entries.map((e) => e.key));
          const additions = numbers
            .map((number) => ({ key: entryKey(betType, number), number }))
            .filter((n) => !existing.has(n.key))
            .map(({ key, number }) => ({
              key,
              betType,
              number,
              stake: state.defaultStake,
              payout,
            }));
          return { entries: [...state.entries, ...additions] };
        }),

      removeMany: (betType, numbers) =>
        set((state) => {
          const drop = new Set(numbers.map((n) => entryKey(betType, n)));
          return { entries: state.entries.filter((e) => !drop.has(e.key)) };
        }),

      remove: (key) =>
        set((state) => ({ entries: state.entries.filter((e) => e.key !== key) })),

      updateStake: (key, stake) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.key === key ? { ...e, stake } : e)),
        })),

      applyStakeToAll: (stake) =>
        set((state) => ({
          entries: state.entries.map((e) => ({ ...e, stake })),
          defaultStake: stake,
        })),

      clear: () => set({ entries: [] }),

      has: (betType, number) =>
        get().entries.some((e) => e.key === entryKey(betType, number)),

      totalStake: () => get().entries.reduce((sum, e) => sum + e.stake, 0),

      maxWin: () =>
        get().entries.reduce((sum, e) => sum + Math.round(e.stake * e.payout), 0),
    }),
    {
      name: 'll:bet-slip',
      partialize: (state) => ({
        roundId: state.roundId,
        entries: state.entries,
        defaultStake: state.defaultStake,
      }),
    },
  ),
);
