'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PackagePickerModal } from '@/components/lottery/PackagePickerModal';
import { Countdown } from '@/components/ui/Countdown';
import { useRouter } from '@/i18n/navigation';
import { useCountdown } from '@/lib/hooks/use-countdown';
import type { LotteryRound, YeekeeRound } from '@/types';

import styles from './YeekeeRoundDetail.module.scss';

/** The phase currently gating this round, and when it closes. */
function currentPhase(round: YeekeeRound): { phase: 'bet' | 'shoot' | 'done'; closesAt: string | null } {
  if (round.isFinal) return { phase: 'done', closesAt: null };

  // Keep in sync with `roundState()` in YeekeeRoundGrid.tsx: the backend's
  // `isOpenForPlay` flag is the authority on whether this round is currently
  // playable at all — the grid marks a non-final, non-open round 'upcoming'
  // (i.e. not actionable). If it says the round isn't open for play, don't
  // fall back to raw timestamp math and risk showing a live 'bet'/'shoot' CTA
  // the grid itself wouldn't let you select.
  if (!round.isOpenForPlay) return { phase: 'done', closesAt: null };

  const now = Date.now();

  // Each window is checked independently on its own open/close bounds — do
  // not infer phase from comparing `betClosesAt` to `shootClosesAt`, since
  // there's no guarantee one is always later than the other, and that would
  // leave the 'bet' branch unreachable whenever it isn't. Shoot is checked
  // first: it's the narrower, more time-sensitive action when both windows
  // happen to be open simultaneously.
  const shootOpen =
    new Date(round.shootOpensAt).getTime() <= now && now < new Date(round.shootClosesAt).getTime();
  if (shootOpen) {
    return { phase: 'shoot', closesAt: round.shootClosesAt };
  }

  const betOpen =
    new Date(round.betOpensAt).getTime() <= now && now < new Date(round.betClosesAt).getTime();
  if (betOpen) {
    return { phase: 'bet', closesAt: round.betClosesAt };
  }

  return { phase: 'done', closesAt: null };
}

export function YeekeeRoundDetail({
  round,
  marketRound,
}: {
  round: YeekeeRound;
  /** The market's own `LotteryRound` entry — needed for the package picker's group id. */
  marketRound: LotteryRound;
}) {
  const t = useTranslations('lottery.yeekee');
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  const { phase, closesAt } = currentPhase(round);
  // Not read directly — `<Countdown>` below manages its own ticking interval.
  // This call exists purely so this component re-renders every second and
  // `currentPhase()` gets re-evaluated, letting the phase flip automatically
  // from 'shoot' to 'done' without a page refresh.
  useCountdown(closesAt);

  return (
    <div className={styles.box}>
      <div className={styles.top}>
        <span className={styles.roundNo}>
          {t('roundNumber', { no: round.roundNo })}
        </span>
        <span className={styles.pill} data-phase={phase}>
          {t(`phase.${phase}`)}
        </span>
      </div>

      {phase !== 'done' && closesAt && (
        <div className={styles.phaseRow}>
          <div className={styles.phaseLabel}>
            {phase === 'shoot' ? t('shootClosesIn') : t('betClosesIn')}
          </div>
          <Countdown target={closesAt} size="lg" />
        </div>
      )}

      {phase !== 'done' ? (
        <button type="button" className={styles.playBtn} onClick={() => setShowPicker(true)}>
          {t('playThisRound')}
        </button>
      ) : (
        <button
          type="button"
          className={styles.resultBtn}
          onClick={() => router.push(`/lottery/yeekee/${round.marketId}/${round.id}/result`)}
        >
          {t('viewResult')}
        </button>
      )}

      <PackagePickerModal
        round={showPicker ? marketRound : null}
        onClose={() => setShowPicker(false)}
      />
    </div>
  );
}
