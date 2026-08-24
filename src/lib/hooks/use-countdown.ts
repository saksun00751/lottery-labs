'use client';

import { useEffect, useState } from 'react';

import { computeCountdown, type Countdown } from '@/lib/utils/lottery';

/**
 * Ticks once a second while the target is in the future, then stops.
 *
 * The initial state is computed on the client only — rendering a live
 * countdown on the server would guarantee a hydration mismatch, so the first
 * paint shows the SSR-safe value and the interval takes over after mount.
 */
export function useCountdown(target: string | number | null): Countdown | null {
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    if (!target) {
      setCountdown(null);
      return;
    }

    const tick = () => setCountdown(computeCountdown(target));
    tick();

    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [target]);

  return countdown;
}
