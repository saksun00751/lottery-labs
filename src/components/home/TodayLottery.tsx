'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { PackagePickerModal } from '@/components/lottery/PackagePickerModal';
import { Countdown } from '@/components/ui/Countdown';
import { Skeleton } from '@/components/ui/Feedback';
import { useRounds } from '@/lib/api/queries';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { useRoundPicker } from '@/lib/hooks/use-round-picker';
import { cn } from '@/lib/utils/cn';
import { isBettable } from '@/lib/utils/lottery';
import type { LotteryRound, RoundStatus } from '@/types';

import styles from './TodayLottery.module.scss';

const TONE_CLASS: Record<RoundStatus, string> = {
  open: styles.toneOpen,
  closing: styles.toneClosing,
  closed: styles.toneClosed,
  settled: styles.toneSettled,
};

const STATUS_KEY: Record<RoundStatus, string> = {
  open: 'open',
  closing: 'closingSoon',
  closed: 'closed',
  settled: 'settled',
};

function initials(name: string): string {
  return name.trim().slice(0, 2);
}

function MarketCard({
  round,
  onPlay,
  loading,
}: {
  round: LotteryRound;
  onPlay: (round: LotteryRound) => void;
  loading?: boolean;
}) {
  const t = useTranslations('lottery');
  const settled = round.status === 'settled' && !!round.result;

  // The server-known status only refreshes every 60s (see useRounds), so once
  // the countdown itself hits zero the card must stop being clickable without
  // waiting for that refetch — otherwise a tap can land after betting closed.
  const statusBettable = isBettable(round.status);
  const countdown = useCountdown(statusBettable ? round.closesAt : null);
  const expired = statusBettable && (countdown?.expired ?? false);
  const bettable = statusBettable && !expired;
  // Same reasoning as RoundCard: a yeekee market's own status reflects its
  // single latest daily draw, not whether any of its many intraday rounds
  // are currently open — so its card stays clickable regardless of `bettable`.
  const clickable = round.category === 'yeekee' || bettable;

  const content = (
    <>
      <div className={styles.top}>
        <span className={styles.badge} aria-hidden>
          {round.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={round.iconUrl} alt="" className={styles.badgeImg} />
          ) : (
            initials(round.name)
          )}
        </span>
        <span className={styles.name}>
          <b>{round.name}</b>
          <span>
            {t('roundLabel')} {round.label}
          </span>
        </span>
        <span className={styles.dot} aria-hidden />
      </div>

      {settled ? (
        <div className={styles.body}>
          <div className={styles.num}>
            <span className={styles.numLabel}>{t('betTypes.3top')}</span>
            <span className={styles.numValue}>{round.result?.top3 ?? '—'}</span>
          </div>
          <div className={styles.num}>
            <span className={styles.numLabel}>{t('betTypes.2bottom')}</span>
            <span className={styles.numValue}>{round.result?.bottom2 ?? '—'}</span>
          </div>
        </div>
      ) : bettable ? (
        <div className={styles.playRow}>
          <span className={styles.playLabel}>
            {t('playNow')}
            <ChevronRight size={13} aria-hidden />
          </span>
          <Countdown target={round.closesAt} />
        </div>
      ) : (
        <div className={styles.status}>{expired ? t('closed') : t(STATUS_KEY[round.status])}</div>
      )}
    </>
  );

  const toneKey: RoundStatus = expired ? 'closed' : round.status;

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onPlay(round)}
        disabled={loading}
        aria-busy={loading || undefined}
        className={cn(
          styles.card,
          styles.clickable,
          styles.asButton,
          TONE_CLASS[toneKey],
          loading && styles.loading,
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn(styles.card, TONE_CLASS[toneKey])}>{content}</div>;
}

export function TodayLottery() {
  const t = useTranslations('lottery');
  const { data, isLoading } = useRounds();
  const rounds = (data as LotteryRound[] | undefined) ?? [];
  const { play, checkingId, pickerRound, closePicker } = useRoundPicker();

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rounds: LotteryRound[] }>();
    for (const round of rounds) {
      const key = round.groupCode ?? round.category;
      const existing = map.get(key);
      if (existing) {
        existing.rounds.push(round);
      } else {
        map.set(key, { name: round.groupName || t(`categories.${round.category}`), rounds: [round] });
      }
    }
    return Array.from(map, ([key, value]) => ({ key, ...value }));
  }, [rounds, t]);

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={104} radius={14} />
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {groups.map((group) => (
        <div key={group.key} className={styles.groupBlock}>
          <div className={styles.groupHead}>
            <span className={styles.groupName}>{group.name}</span>
            <span className={styles.groupCount}>{group.rounds.length}</span>
          </div>
          <div className={styles.grid}>
            {group.rounds.map((round) => (
              <MarketCard
                key={round.id}
                round={round}
                onPlay={play}
                loading={checkingId === round.id}
              />
            ))}
          </div>
        </div>
      ))}

      <PackagePickerModal round={pickerRound} onClose={closePicker} />
    </div>
  );
}
