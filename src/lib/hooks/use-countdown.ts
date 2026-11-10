'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { computeCountdown, type Countdown } from '@/lib/utils/lottery';

/**
 * One app-wide 1s ticker shared by every countdown on screen. The home page
 * can show dozens of market cards; giving each its own `setInterval` meant
 * dozens of timers firing independently. Now a single interval runs only
 * while at least one countdown is subscribed.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  // Cached between ticks — `useSyncExternalStore` requires a stable snapshot.
  if (now === 0) now = Date.now();
  return now;
}
// Server render has no clock tick: `null` keeps hydration identical.
const getServerSnapshot = () => 0;

const noopSubscribe = () => () => undefined;

/**
 * Returns the live countdown to `target`, or `null` on the server / first
 * paint (a live value would guarantee a hydration mismatch) and when there is
 * no target. Subscribes to the shared ticker only while the target is still
 * in the future, so expired cards stop re-rendering.
 */
export function useCountdown(target: string | number | null): Countdown | null {
  const targetMs = target ? new Date(target).getTime() : null;
  const tick = useSyncExternalStore(
    targetMs !== null && targetMs > Date.now() ? subscribe : noopSubscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useMemo(
    () => (target && tick !== 0 ? computeCountdown(target, Math.max(tick, Date.now())) : null),
    [target, tick],
  );
}
