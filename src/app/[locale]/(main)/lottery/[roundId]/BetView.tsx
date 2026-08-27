'use client';

import { AlertTriangle, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { BetSlipPanel } from '@/components/lottery/BetSlipPanel';
import { BetTypeGrid } from '@/components/lottery/BetTypeGrid';
import { NumberBoard } from '@/components/lottery/NumberBoard';
import { RestrictedNumbersPanel } from '@/components/lottery/RestrictedNumbersPanel';
import { SelectedPackageCard } from '@/components/lottery/SelectedPackageCard';
import { Countdown } from '@/components/ui/Countdown';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useRouter } from '@/i18n/navigation';
import { useRates, useRound, useSelectedPackage } from '@/lib/api/queries';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { pushToast } from '@/lib/toast';
import { BET_TYPE_ORDER, betTypeGroup, isBettable, mergePackageRates } from '@/lib/utils/lottery';
import { useBetSlipStore } from '@/store/bet-slip-store';
import type { BetTypeId, LotteryPackage, LotteryRound, RoundRates } from '@/types';

import styles from '../lottery.module.scss';

export function BetView({ roundId }: { roundId: string }) {
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const { data: roundData, isLoading: roundLoading } = useRound(roundId);
  const { data: ratesData, isLoading: ratesLoading } = useRates(roundId);
  const setRound = useBetSlipStore((s) => s.setRound);

  const round = roundData as LotteryRound | undefined;
  const rates = ratesData as RoundRates | undefined;

  // The server-known status only refreshes when this page's own queries
  // refetch (no polling), so once the countdown itself hits zero the board
  // must stop being biddable without waiting for that — otherwise a bet can
  // land after betting closed. Mirrors the home page's `MarketCard`.
  const statusBettable = !!round && isBettable(round.status);
  const countdown = useCountdown(statusBettable ? (round as LotteryRound).closesAt : null);
  const expired = statusBettable && (countdown?.expired ?? false);
  const bettable = statusBettable && !expired;

  const { data: selectedPackageData, isLoading: selectedPackageLoading } = useSelectedPackage(
    round?.groupId,
  );
  const selectedPackage = selectedPackageData as LotteryPackage | null | undefined;

  // Mirrors lotto-seed-app's `bet/page.tsx` hard gate — a group requires a
  // selected package before its rounds can be bet on; bounce back to the
  // list with a toast instead of rendering the board (covers direct-URL
  // access and back/forward nav, not just the round-card flow).
  useEffect(() => {
    if (!round?.groupId || selectedPackageLoading || selectedPackageData) return;
    pushToast({ tone: 'warning', title: t('package.required') });
    router.replace('/lottery');
  }, [round?.groupId, selectedPackageLoading, selectedPackageData, router, t]);

  // Multi-select within one group at a time — e.g. [3top, 3tod] together, but
  // never mixed with a 2-digit or run type. Matches lotto-seed-app: picking a
  // chip from a different group replaces the selection; picking one in the
  // same group toggles it in place.
  const [selectedTypes, setSelectedTypes] = useState<BetTypeId[]>([]);

  const toggleType = (id: BetTypeId) => {
    setSelectedTypes((prev) => {
      const currentGroup = prev.length > 0 ? betTypeGroup(prev[0]) : null;
      if (currentGroup && currentGroup !== betTypeGroup(id)) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  // Switching rounds clears the slip — rates and restrictions do not carry over.
  useEffect(() => {
    setRound(roundId);
    setSelectedTypes([]);
  }, [roundId, setRound]);

  // `round.betTypes` is always empty — the bulk listing that produces it carries
  // no per-market bet-type data. `rates` (this round's own betting-context call)
  // is the only place that's actually known, so it's the sole source here.
  const availableTypes = useMemo(() => {
    if (!rates) return [];
    const merged = mergePackageRates(rates.betTypes, selectedPackage ?? null);
    return [...merged].sort(
      (a, b) => BET_TYPE_ORDER.indexOf(a.id) - BET_TYPE_ORDER.indexOf(b.id),
    );
  }, [rates, selectedPackage]);

  // Also covers the moment between confirming no package is selected and the
  // redirect effect above actually navigating away — never flash the board.
  const gatingOnPackage = !!round?.groupId && (selectedPackageLoading || !selectedPackageData);

  if (roundLoading || ratesLoading || gatingOnPackage) {
    return (
      <div className={styles.page}>
        <Skeleton height={92} radius={20} />
        <Skeleton height={420} radius={20} />
      </div>
    );
  }

  if (!round || !rates) {
    return <EmptyState title={tCommon('notFound')} description={tCommon('notFoundHint')} />;
  }

  const boardTypes = availableTypes.filter((type) => selectedTypes.includes(type.id));

  return (
    <div className={styles.page}>
      <div className={styles.roundHeader}>
        <span className={styles.roundEmblem} aria-hidden>
          <Ticket size={24} />
        </span>
        <div className={styles.roundInfo}>
          <div className={styles.roundName}>{round.name}</div>
          <div className={styles.roundLabel}>
            {t('roundLabel')} {round.label}
          </div>
        </div>
        {bettable && (
          <div className={styles.roundTimer}>
            <span className={styles.roundTimerLabel}>{t('closesIn')}</span>
            <Countdown target={round.closesAt} size="lg" />
          </div>
        )}
      </div>

      {!bettable ? (
        <div className={styles.closedNotice}>
          <AlertTriangle size={18} aria-hidden />
          {t('slip.roundClosed')}
        </div>
      ) : (
        <div className={styles.betLayout}>
          <div className={styles.leftColumn}>
            <SelectedPackageCard groupId={round.groupId} />
            <RestrictedNumbersPanel restricted={rates.restricted} />
          </div>

          <div className={styles.boardArea}>
            <BetTypeGrid types={availableTypes} value={selectedTypes} onToggle={toggleType} />

            {boardTypes.length > 0 && (
              <NumberBoard types={boardTypes} restricted={rates.restricted} />
            )}
          </div>

          <BetSlipPanel round={round} />
        </div>
      )}
    </div>
  );
}
