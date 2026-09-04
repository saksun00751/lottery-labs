'use client';

import { ChevronRight, Clock, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import { useRoundPicker } from '@/lib/hooks/use-round-picker';
import { cn } from '@/lib/utils/cn';
import { isBettable, sortBetTypes } from '@/lib/utils/lottery';
import type { LotteryRound, RoundStatus } from '@/types';

import { PackagePickerModal } from './PackagePickerModal';
import styles from './RoundCard.module.scss';

const STATUS_TONE: Record<RoundStatus, BadgeTone> = {
  open: 'success',
  closing: 'warning',
  closed: 'neutral',
  settled: 'info',
};

const STATUS_KEY: Record<RoundStatus, string> = {
  open: 'open',
  closing: 'closingSoon',
  closed: 'closed',
  settled: 'settled',
};

export function RoundCard({
  round,
  onPlay,
  loading,
}: {
  round: LotteryRound;
  onPlay: (round: LotteryRound) => void;
  loading?: boolean;
}) {
  const t = useTranslations('lottery');
  const bettable = isBettable(round.status);
  // A yeekee market's own `status` reflects its single latest daily draw,
  // which says nothing about whether any of its many intraday rounds are
  // currently open — that's only known once inside the rounds board. So a
  // yeekee card stays clickable regardless of `bettable`, unlike every
  // other category where a closed market really has nothing to enter.
  const clickable = round.category === 'yeekee' || bettable;

  const body = (
    <>
      <div className={styles.head}>
        <span className={styles.emblem} aria-hidden>
          <Ticket size={22} />
        </span>
        <div className={styles.titleGroup}>
          <div className={styles.name}>{round.name}</div>
          <div className={styles.label}>
            {t('roundLabel')} {round.label}
          </div>
        </div>
        <Badge
          tone={STATUS_TONE[round.status]}
          dot
          pulse={round.status === 'closing'}
        >
          {t(STATUS_KEY[round.status])}
        </Badge>
      </div>

      <div className={styles.timer}>
        <span className={styles.timerLabel}>
          <Clock size={15} aria-hidden />
          {bettable ? t('closesIn') : t('closed')}
        </span>
        {bettable && <Countdown target={round.closesAt} />}
      </div>

      <div className={styles.foot}>
        <div className={styles.types}>
          {sortBetTypes(round.betTypes)
            .slice(0, 3)
            .map((id) => (
              <span key={id} className={styles.type}>
                {t(`betTypes.${id}`)}
              </span>
            ))}
        </div>
        {clickable && <ChevronRight size={18} aria-hidden />}
      </div>
    </>
  );

  if (!clickable) {
    return (
      <div className={cn(styles.card, styles.disabled)} aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPlay(round)}
      disabled={loading}
      aria-busy={loading || undefined}
      className={cn(styles.card, styles.asButton, loading && styles.loading)}
    >
      {body}
    </button>
  );
}

export function RoundGrid({ rounds }: { rounds: LotteryRound[] }) {
  const { play, checkingId, pickerRound, closePicker } = useRoundPicker();

  return (
    <>
      <div className={styles.grid}>
        {rounds.map((round) => (
          <RoundCard key={round.id} round={round} onPlay={play} loading={checkingId === round.id} />
        ))}
      </div>
      <PackagePickerModal round={pickerRound} onClose={closePicker} />
    </>
  );
}
