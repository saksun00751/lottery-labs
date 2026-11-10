'use client';

import { create } from 'zustand';

interface RealtimeState {
  /** True while the websocket is live — polling can then back off to a slow safety net. */
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));

const FAST_POLL_MS = 60_000;
const SLOW_POLL_MS = 5 * 60_000;

/**
 * `refetchInterval` callback: events keep the data fresh while the socket is
 * up, so poll only as a slow safety net; fall back to the fast cadence the
 * moment it drops. Re-evaluated after every fetch.
 */
export const pollInterval = () =>
  useRealtimeStore.getState().connected ? SLOW_POLL_MS : FAST_POLL_MS;
